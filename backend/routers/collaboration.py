from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from database import SessionLocal
import models
from services.collaboration.auth import authenticate_websocket_user
from services.collaboration.manager import collaboration_manager
from services.permissions import role_at_least, get_effective_page_role

router = APIRouter(tags=["collaboration"])


@router.websocket("/ws/pages/{page_id}")
async def page_collaboration(websocket: WebSocket, page_id: str):
    db = SessionLocal()
    connection = None

    try:
        token = websocket.query_params.get("token")
        user = authenticate_websocket_user(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
            return

        role = get_effective_page_role(db, user, page_id)
        if not role_at_least(role, "viewer"):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Page not found")
            return

        connection = await collaboration_manager.connect(page_id, websocket, user.id, user.name)
        snapshot = await collaboration_manager.get_snapshot(page_id)

        await collaboration_manager.send_to_connection(connection, {
            "type": "presence.snapshot",
            "pageId": page_id,
            "payload": {
                "participants": snapshot,
                "selfSessionId": connection.session_id,
            },
        })

        await collaboration_manager.broadcast(page_id, {
            "type": "presence.join",
            "pageId": page_id,
            "payload": connection.to_presence_dict(),
        }, exclude_session_id=connection.session_id)

        while True:
            message = await websocket.receive_json()
            event_type = message.get("type")
            payload = message.get("payload") or {}

            if event_type == "presence.heartbeat":
                participant = await collaboration_manager.touch(page_id, connection.session_id)
                if participant:
                    await collaboration_manager.send_to_connection(connection, {
                        "type": "presence.heartbeat_ack",
                        "pageId": page_id,
                        "payload": {
                            "sessionId": connection.session_id,
                            "lastSeenAt": participant["lastSeenAt"],
                        },
                    })
            elif event_type == "presence.focus_block":
                block_id = payload.get("blockId")
                participant = await collaboration_manager.update_focus(page_id, connection.session_id, block_id)
                if participant:
                    await collaboration_manager.broadcast(page_id, {
                        "type": "presence.focus_block",
                        "pageId": page_id,
                        "payload": participant,
                    })
    except WebSocketDisconnect:
        pass
    finally:
        if connection:
            disconnected = await collaboration_manager.disconnect(page_id, connection.session_id)
            if disconnected:
                await collaboration_manager.broadcast(page_id, {
                    "type": "presence.leave",
                    "pageId": page_id,
                    "payload": {
                        "sessionId": disconnected.session_id,
                        "user": {
                            "id": disconnected.user_id,
                            "name": disconnected.user_name,
                        },
                    },
                })
        db.close()

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime

from fastapi import WebSocket


@dataclass
class CollaborationConnection:
    session_id: str
    page_id: str
    user_id: str
    user_name: str
    websocket: WebSocket
    focused_block_id: str | None = None
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_seen_at: datetime = field(default_factory=datetime.utcnow)

    def to_presence_dict(self) -> dict:
        return {
            "sessionId": self.session_id,
            "pageId": self.page_id,
            "user": {
                "id": self.user_id,
                "name": self.user_name,
            },
            "focusedBlockId": self.focused_block_id,
            "connectedAt": self.connected_at.isoformat(),
            "lastSeenAt": self.last_seen_at.isoformat(),
        }


class CollaborationManager:
    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, CollaborationConnection]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, page_id: str, websocket: WebSocket, user_id: str, user_name: str) -> CollaborationConnection:
        await websocket.accept()
        connection = CollaborationConnection(
            session_id=str(uuid.uuid4()),
            page_id=page_id,
            user_id=user_id,
            user_name=user_name or "Anonymous",
            websocket=websocket,
        )
        async with self._lock:
            self._rooms.setdefault(page_id, {})[connection.session_id] = connection
        return connection

    async def disconnect(self, page_id: str, session_id: str) -> CollaborationConnection | None:
        async with self._lock:
            room = self._rooms.get(page_id)
            if not room:
                return None
            connection = room.pop(session_id, None)
            if room == {}:
                self._rooms.pop(page_id, None)
            return connection

    async def get_snapshot(self, page_id: str) -> list[dict]:
        async with self._lock:
            room = self._rooms.get(page_id, {})
            return [conn.to_presence_dict() for conn in room.values()]

    async def update_focus(self, page_id: str, session_id: str, block_id: str | None) -> dict | None:
        async with self._lock:
            room = self._rooms.get(page_id, {})
            connection = room.get(session_id)
            if not connection:
                return None
            connection.focused_block_id = block_id
            connection.last_seen_at = datetime.utcnow()
            return connection.to_presence_dict()

    async def touch(self, page_id: str, session_id: str) -> dict | None:
        async with self._lock:
            room = self._rooms.get(page_id, {})
            connection = room.get(session_id)
            if not connection:
                return None
            connection.last_seen_at = datetime.utcnow()
            return connection.to_presence_dict()

    async def send_to_connection(self, connection: CollaborationConnection, message: dict) -> None:
        await connection.websocket.send_json(message)

    async def broadcast(self, page_id: str, message: dict, *, exclude_session_id: str | None = None) -> None:
        async with self._lock:
            recipients = [
                conn
                for session_id, conn in self._rooms.get(page_id, {}).items()
                if session_id != exclude_session_id
            ]

        stale_connections: list[tuple[str, str]] = []
        for connection in recipients:
            try:
                await connection.websocket.send_json(message)
            except Exception:
                stale_connections.append((connection.page_id, connection.session_id))

        for stale_page_id, stale_session_id in stale_connections:
            await self.disconnect(stale_page_id, stale_session_id)


collaboration_manager = CollaborationManager()

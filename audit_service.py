from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
import models

def record_audit(
    db: Session,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    actor: Optional[models.User] = None,
    actor_name: Optional[str] = None,
    actor_role: Optional[str] = None
) -> models.AuditLog:
    """
    Persists an immutable system audit record.
    """
    if actor:
        actor_user_id = actor.user_id
        actor_name = actor.name
        actor_role = actor.role.value if hasattr(actor.role, "value") else str(actor.role)
    else:
        actor_user_id = None
        actor_name = actor_name or "System Policy Engine"
        actor_role = actor_role or "system"

    log_entry = models.AuditLog(
        actor_user_id=actor_user_id,
        actor_name=actor_name,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        details=details,
        created_at=datetime.now(timezone.utc)
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


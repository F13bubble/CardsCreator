from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status


from database import get_db
from models import User, Group

class GroupCreate(BaseModel):
    name: str = Field(min_length=3, max_length=50)
    description: str = Field(min_length=5, max_length=255)
    created_by: str = Field(min_length=3, max_length=50)

def create_group(db: Session, group_in: GroupCreate, current_user: User) -> Group:
    if db.query(Group).filter(Group.name == group_in.name).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Group already exists")

    group = Group(
        name=str(group_in.name),
        description=group_in.description,
        created_by=current_user.id
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    add_user_to_group(db, current_user.id, group.id)
    return group

def add_user_to_group(db: Session, user_id: int, group_id: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    group = db.query(Group).filter(Group.id == group_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group not in user.groups:
        user.groups.append(group)
        db.commit()
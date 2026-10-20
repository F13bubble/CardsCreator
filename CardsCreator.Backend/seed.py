from __future__ import annotations

import argparse

from sqlalchemy.orm import Session

from auth import get_password_hash
from database import SessionLocal, init_db
from models import Group, User, user_groups


DEFAULT_USERS: list[dict[str, str]] = [
    {"email": "lucaelijamauro@outlook.de", "username": "Luca", "password": "MPi112!!"},
    {"email": "alice@example.com", "username": "alice", "password": "Password123!"},
    {"email": "bob@example.com", "username": "bob", "password": "Password123!"},
    {"email": "charlie@example.com", "username": "charlie", "password": "Password123!"},
]

DEFAULT_GROUPS: list[dict[str, object]] = [
    {"name": "Design Team", "description": "Mock team for UI and design work.", "created_by": "alice", "members": ["alice", "bob"]},
    {"name": "Product Team", "description": "Mock team for product planning.", "created_by": "bob", "members": ["bob", "charlie"]},
    {"name": "Engineering Team", "description": "Mock team for engineering delivery.", "created_by": "charlie", "members": ["alice", "charlie"]},
]


def _get_or_create_user(db: Session, *, email: str, username: str, password: str) -> User:
    existing_user = db.query(User).filter((User.email == email) | (User.username == username)).first()
    if existing_user is not None:
        return existing_user

    user = User(
        email=email,
        username=username,
        password_hash=get_password_hash(password),
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _get_or_create_group(db: Session, *, name: str, description: str, created_by: str) -> Group:
    existing_group = db.query(Group).filter(Group.name == name).first()
    if existing_group is not None:
        return existing_group

    group = Group(name=name, description=description, created_by=created_by)
    db.add(group)
    db.flush()
    return group


def seed_database(db: Session | None = None, *, clear_existing: bool = False) -> dict[str, int]:
    if db is None:
        init_db()
        db = SessionLocal()
        close_session = True
    else:
        close_session = False

    try:
        if clear_existing:
            db.execute(user_groups.delete())
            db.query(Group).delete(synchronize_session=False)
            db.query(User).delete(synchronize_session=False)
            db.commit()

        users_by_username: dict[str, User] = {}

        for user_data in DEFAULT_USERS:
            user = _get_or_create_user(
                db,
                email=user_data["email"],
                username=user_data["username"],
                password=user_data["password"],
            )
            users_by_username[user.username] = user

        for group_data in DEFAULT_GROUPS:
            group = _get_or_create_group(
                db,
                name=group_data["name"],
                description=group_data["description"],
                created_by=group_data["created_by"],
            )

            for username in group_data["members"]:
                member = users_by_username[username]
                if member not in group.users:
                    group.users.append(member)

        db.commit()
        return {"users": len(DEFAULT_USERS), "groups": len(DEFAULT_GROUPS)}

    finally:
        if close_session:
            db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the CardsCreator database with test data")
    parser.add_argument("--clear", action="store_true", help="Löscht vorhandene Nutzer- und Gruppendaten vor dem Seed")
    args = parser.parse_args()

    result = seed_database(clear_existing=args.clear)
    print(f"Seeded {result['users']} users and {result['groups']} groups.")


if __name__ == "__main__":
    main()
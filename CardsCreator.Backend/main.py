from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth import (
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    authenticate_user,
    create_access_token,
    create_user,
    get_current_user,
)
from groups import GroupCreate, create_group
from database import get_db, init_db
from models import Group, User

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="CardsCreator Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "CardsCreator backend is running"}


@app.post("/auth/register", response_model=dict[str, object], status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> dict[str, object]:
    user = create_user(db, user_in)
    token = create_access_token(str(user.email))
    return {"message": "User registered successfully", "access_token": token, "token_type": "bearer", "user": UserOut.model_validate(user)}


@app.post("/auth/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)) -> Token:
    user = authenticate_user(db, str(user_in.email), user_in.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(str(user.email))
    return Token(access_token=token)


@app.get("/auth/me", response_model=UserOut)
def get_me(current_user=Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@app.get("/groups")
def list_user_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.refresh(current_user)
    return [
        {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "created_by": group.created_by,
        }
        for group in current_user.groups
    ]


@app.post("/groups")
def create_group_route(
    group_in: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_group(db, group_in, current_user)
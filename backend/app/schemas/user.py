from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    display_name: str | None = None
    daily_calorie_target: int | None = None


class UserUpdate(BaseModel):
    daily_calorie_target: int | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

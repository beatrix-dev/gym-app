from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    display_name: str | None = None
    daily_calorie_target: int | None = None


class UserUpdate(BaseModel):
    daily_calorie_target: int | None = None


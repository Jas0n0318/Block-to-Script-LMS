import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, Enum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"


class ChapterType(str, enum.Enum):
    READING = "READING"
    BLOCKLY = "BLOCKLY"
    CLOZE = "CLOZE"
    PRACTICE = "PRACTICE"


class LearningStatus(str, enum.Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    COMPLETED = "COMPLETED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.STUDENT)
    student_token = Column(String(64), unique=True, default=lambda: str(uuid.uuid4()), nullable=False)
    createdAt = Column(DateTime, default=func.now())

    learningRecords = relationship("LearningRecord", back_populates="user")
    behaviorLogs = relationship("BehaviorLog", back_populates="user")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, default="")
    orderIndex = Column(Integer, default=0)

    courses = relationship("Course", back_populates="topic", order_by="Course.orderIndex")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topicId = Column(Integer, ForeignKey("topics.id"), nullable=False)
    title = Column(String(100), nullable=False)
    orderIndex = Column(Integer, default=0)
    rbxlUrl = Column(Text, nullable=True)
    # Event name for Webhook unlocking (e.g., EVENT_ENV_TEST_COMPLETED)
    unlockEvent = Column(String(100), unique=True, nullable=True)

    topic = relationship("Topic", back_populates="courses")
    chapters = relationship("Chapter", back_populates="course", order_by="Chapter.orderIndex")
    learningRecords = relationship("LearningRecord", back_populates="course")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(100), nullable=False)
    orderIndex = Column(Integer, default=0)
    type = Column(String(20), nullable=False)  # READING, BLOCKLY, CLOZE, PRACTICE
    content = Column(Text, nullable=True)  # Markdown or descriptive text
    blocklyAnswer = Column(Text, nullable=True)
    luaCode = Column(Text, nullable=True)
    luaAnswers = Column(Text, nullable=True)  # JSON array

    course = relationship("Course", back_populates="chapters")


class LearningRecord(Base):
    __tablename__ = "learning_records"
    __table_args__ = (
        UniqueConstraint("userId", "courseId", name="uq_user_course"),
        Index("idx_lr_user", "userId"),
        Index("idx_lr_course", "courseId"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    courseId = Column(Integer, ForeignKey("courses.id"), nullable=False)
    status = Column(String(20), default=LearningStatus.LOCKED)
    # JSON: {"chapter_id": true} or {"reading": true, "blockly": true} for legacy support
    chapters = Column(Text, nullable=True)
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="learningRecords")
    course = relationship("Course", back_populates="learningRecords")


class BehaviorLog(Base):
    __tablename__ = "behavior_logs"
    __table_args__ = (
        Index("idx_bl_user", "userId"),
        Index("idx_bl_course", "courseId"),
        Index("idx_bl_action", "actionType"),
        Index("idx_bl_created", "createdAt"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    courseId = Column(Integer, nullable=True)
    actionType = Column(String(50), nullable=False)
    detail = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)
    createdAt = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="behaviorLogs")

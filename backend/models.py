from sqlalchemy import Column, String, Text, DateTime, Integer, Index
from sqlalchemy.sql import func
from db import Base

class Change(Base):
  __tablename__ = "changes"
  id = Column(Integer, primary_key=True, index=True)
  teacher_id = Column(String, index=True, nullable=False)
  entity = Column(String, nullable=False)       # teacher/school/class/student/log
  entity_id = Column(String, nullable=False)
  op = Column(String, nullable=False)           # upsert/delete
  payload_json = Column(Text, nullable=False)
  happened_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

Index("ix_changes_teacher_happened", Change.teacher_id, Change.happened_at)
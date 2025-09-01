from flask_sqlalchemy import SQLAlchemy

# Initialized in app factory (backend/src/main.py)
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'  # Avoid reserved keyword "user" in PostgreSQL

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }

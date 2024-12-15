-- Active: 1734167523370@@127.0.0.1@3306
CREATE DATABASE IF NOT EXISTS socialMediadb;

USE socialMediadb

CREATE TABLE users (
    userId INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    displayName VARCHAR(255) NOT NULL,
    birthDate DATE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
    postId INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (userId)
);

CREATE TABLE comments (
    commentId INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    postId INT NOT NULL,
    comment TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (userId),
    FOREIGN KEY (postId) REFERENCES posts (postId)
);
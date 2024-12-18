-- Active: 1734167523370@@127.0.0.1@3306
CREATE DATABASE IF NOT EXISTS socialMediadb;

USE socialMediadb;

CREATE TABLE
    users (
        userId INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        displayName VARCHAR(255) NOT NULL,
        birthDate DATE NOT NULL,
        password VARCHAR(255) NOT NULL
    );

CREATE TABLE
    posts (
        postId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId)
    );

CREATE TABLE
    comments (
        commentId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        postId INT NOT NULL,
        comment TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId),
        FOREIGN KEY (postId) REFERENCES posts (postId)
    );

CREATE TABLE
    friends (
        friendId INT PRIMARY KEY AUTO_INCREMENT,
        user1Id INT NOT NULL,
        user2Id INT NOT NULL,
        FOREIGN KEY (user1Id) REFERENCES users (userId),
        FOREIGN KEY (user2Id) REFERENCES users (userId)
    );

CREATE TABLE
    requests (
        requestId INT PRIMARY KEY AUTO_INCREMENT,
        senderId INT NOT NULL,
        recieverId INT NOT NULL,
        FOREIGN KEY (senderId) REFERENCES users (userId),
        FOREIGN KEY (recieverId) REFERENCES users (userId)
    );

CREATE TABLE
    livefeeds (
        livefeedId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        age_restriction INT DEFAULT 0,
        cooldown INT DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users (userId)
    );

CREATE TABLE
    activeUsers (
        activeUserId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        socketId INT NOT NULL,
        livefeedId INT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId),
        FOREIGN KEY (livefeedId) REFERENCES livefeeds (livefeedId)
    );

CREATE TABLE
    follower (
        followerId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        livefeedId INT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
        FOREIGN KEY (livefeedId) REFERENCES livefeeds (livefeedId) ON DELETE CASCADE
    );

CREATE TABLE
    medialinks (
        medialinkId INT PRIMARY KEY AUTO_INCREMENT,
        source VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        postId INT NOT NULL,
        FOREIGN KEY (postId) REFERENCES posts (postId) ON DELETE CASCADE
    );

CREATE TABLE
    ratings (
        ratingId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        postId INT NOT NULL,
        rating TINYINT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
        FOREIGN KEY (postId) REFERENCES posts (postId) ON DELETE CASCADE
    );

CREATE TABLE
    activeUsers (
        activeUserId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        socketId VARCHAR(255) NOT NULL,
        livefeedId INT DEFAULT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
        FOREIGN KEY (livefeedId) REFERENCES livefeeds (livefeedId) ON DELETE CASCADE
    );

CREATE TABLE
    saves (
        saveId INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        postId INT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
        FOREIGN KEY (postId) REFERENCES posts (postId) ON DELETE CASCADE
    );

CREATE TABLE
    chatMessages (
        messageId INT PRIMARY KEY AUTO_INCREMENT,
        senderId INT NOT NULL,
        recieverId INT NOT NULL,
        message TEXT NOT NULL,
        FOREIGN KEY (senderId) REFERENCES users (userId) ON DELETE CASCADE,
        FOREIGN KEY (recieverId) REFERENCES users (userId) ON DELETE CASCADE
    );
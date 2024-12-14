module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Handle events
        socket.on('message', (data) => {
            console.log('Message received:', data);
            io.emit('message', data); // Broadcast to all clients
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
        });
    });
};

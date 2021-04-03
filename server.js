const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let randomColor = require('randomcolor');
const uuid = require('uuid');


const port = process.env.PORT || 3000;


let users = [];
let connections = [];

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');
 
  connections.push(socket)
  let color = randomColor();

  socket.username = 'Anonymous';
  socket.color = color;
 
  //listen on change_username
  socket.on('change_username', data => {
    let id = uuid.v4(); // create a random id for the user
    socket.id = id;
    socket.username = data.nickName;
    users.push({ id, username: socket.username, color: socket.color });
    updateUsernames();
    socket.broadcast.emit('connected', { username: socket.username });
  })

  //update Usernames in the client
  const updateUsernames = () => {
    io.sockets.emit('get users', users)
  }

  //listen on new_message
  socket.on('new_message', (data) => {
    //broadcast the new message
    io.sockets.emit('new_message', { message: data.message, username: socket.username, color: socket.color });
  })

  //Disconnect
  socket.on('disconnect', data => {

    if (!socket.username)
      return;
    socket.broadcast.emit('disconnected', { username: socket.username });
    console.log('a user disconnected');
    //find the user and delete from the users list
    let user = undefined;
    for (let i = 0; i < users.length; i++) {
      if (users[i].id === socket.id) {
        user = users[i];
        break;
      }
    }
    users = users.filter(x => x !== user);
    //Update the users list
    updateUsernames();
    
    connections.splice(connections.indexOf(socket), 1);
  })

  //listen on typing
  socket.on('typing', data => {
    socket.broadcast.emit('typing', { username: socket.username })
  })


});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
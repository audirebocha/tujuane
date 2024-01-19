import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import db_connect from './Db_con.js'

//Database files
import User from './Models/users.js'

const app = express();
//Database connection establishment
db_connect()
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log('Client ' + socket.id + ' connected')

  
  socket.on('disconnect', async (reason) => {
    console.log("Client " + socket.id + " Disconnected")
    //Updating database that user has disconnected
    var result = await User.find({ sid: socket.id })
    if (result) {
      //Updating the users status as disconnected and broadcasting it
      let user_doc = await User.findOne({ 'sid': socket.id })
      if (user_doc) {
        await user_doc.updateOne({ 'status': 'disconnected' })
        var result = await user_doc.save()
        //Broadcasting the users status
        socket.broadcast.emit('broadcast_connectivity_status', { status: 'success', message: 'A user has disconnected , check and update your database', 'data': result })
      } else {
        console.log('Error in updating user disconnect status')
      }
    } else {
      console.log('Error, user doesnt exist')
    }
  })

  socket.on('auth_data', async (data) => {
    console.log('Client ' + data['email'] + " has connected, updating ad broadcasting status")
    //Updating database that user has disconnected
    var result = await User.find({ email: data['email'] })
    if (result) {
      //Updating the users status as disconnected and broadcasting it
      let user_doc = await User.findOne({ 'email': data['email'] })
      if (user_doc) {
        await user_doc.updateOne({ 'status': 'connected' })
        var result = await user_doc.save()
        //Broadcasting the users status
        socket.broadcast.emit('broadcast_connectivity_status', { status: 'success', message: 'A user has connected , check and update your database', 'data': result })
      } else {
        console.log('Error in updating user connected status')
      }
    } else {
      console.log('Error, user doesnt exist')
    }

  })

  socket.on('get_users_count', (data) => {
    socket.emit('receive_user_count', io.engine.clientsCount)
  })

  socket.on('relay_2_group', (message) => {
    socket.broadcast.emit("message_from_group", socket.id + ": " + message);
  })

  socket.on('relay_2_individual', (message) => {
    console.log('Relaying message')
    //Sending confirmation back to the user that the server has been received
    io.to(socket.id).emit('sent_confirmation', message['local_message_id'], (err) => {
      if (!err) {
        console.log('Error,not sent')
        //Store in the buffer
      } else {
        console.log('Confirmation Successfully sent to the sender')
      }
    })

    //Sending the message to the recipient
    io.to(message.recipient_sid).emit('received_message', message, async (err) => {
      if (!err) {
        console.log('Error something happened, in sending to the recipient')
        //Check for the correct recipient sid in the database using the recipient id
        if (io.sockets.sockets[message.recipient_sid] != undefined) {
          console.log(io.sockets.sockets[message.recipient_sid]);
        } else {
          console.log("User Socket not connected");
          //User sid not connected, finding the status and sid of the user
          var result = await User.find({ _id: message.recipient_id })
          if (result) {
            //If the status is connected,Attempt to send to the recipient
            console.log("Looking up SID and resending message...");
            if (result['status'] === 'connected' || result['status'] === 'online') {
              //Sending to recipient
              io.to(result['recipient_sid']).emit('received_message', message, async (err) => {
                if (!err) {
                  console.log("Recipient is assumed to be disconnected, storing message in the buffer");
                  //The connection has a propblem , Update the database and broadcast to everyone that user is disconnected
                  //Updating the users status as disconnected and broadcasting it
                  let user_doc = await User.findOne({ '_id':message.recipient_id })
                  if (user_doc) {
                    await user_doc.updateOne({ 'status': 'disconnected' })
                    var result = await user_doc.save()
                    //Broadcasting the users status
                    socket.broadcast.emit('broadcast_connectivity_status', { status: 'success', message: 'A user has been deemed disconnected , check and update your database', 'data': result })
                  } else {
                    console.log('Error in updating user connected status')
                  }

                  //Store the message on the buffer for when the user is reconnected


                }
              })
            } else {
              //User is disconnected , store in the buffer to send when user is connnected
              console.log("User is definetly disconnected");
            }


          }
        }

      } else {
        console.log('Successfully sent to the recipient')
      }
    })
  })



});

io.on('greeting', (socket) => {
  console.log('Server said hi')
})



httpServer.listen(5001);
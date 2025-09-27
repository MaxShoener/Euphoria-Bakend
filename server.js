import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { WebSocketServer } from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Login endpoint
app.post('/login',(req,res)=>{
  const { username,password } = req.body;
  if(username && password){
    res.json({ success:true, token:'fake-jwt-token' });
  }else{
    res.status(400).json({ success:false });
  }
});

// Remote play WebSocket
const wss = new WebSocketServer({ noServer:true });
wss.on('connection', ws => {
  ws.on('message', msg => {
    console.log('Remote Play message:', msg.toString());
    ws.send(`Echo: ${msg}`);
  });
});

// Proxy for arbitrary URLs
app.get('/proxy', async (req,res)=>{
  try{
    const url = req.query.url;
    const response = await fetch(url);
    const text = await response.text();
    res.send(text);
  } catch(e){
    res.status(500).send('Failed to fetch');
  }
});

const server = app.listen(PORT,()=>console.log(`Backend running on port ${PORT}`));
server.on('upgrade',(req,socket,head)=>{
  wss.handleUpgrade(req,socket,head,ws=>{
    wss.emit('connection',ws,req);
  });
});

const http=require('http');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'public');
const videos=path.join(process.env.HOME,'storage/shared/NEXORA-INDIA-VIDEOS');

fs.mkdirSync(videos,{recursive:true});

const mime={
 '.html':'text/html; charset=utf-8',
 '.css':'text/css',
 '.js':'application/javascript',
 '.json':'application/json',
 '.mp4':'video/mp4',
 '.webm':'video/webm'
};

http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');

 if(u.pathname==='/api/videos'){
  const list=fs.readdirSync(videos)
   .filter(f=>/\.(mp4|webm)$/i.test(f));

  res.writeHead(200,{'Content-Type':'application/json'});
  return res.end(JSON.stringify(list));
 }

 if(u.pathname==='/api/upload'&&req.method==='POST'){
  let name;
  try{
   name=path.basename(decodeURIComponent(req.headers['x-filename']||''));
  }catch{
   res.writeHead(400);
   return res.end('Invalid filename');
  }

  if(!name||!/\.(mp4|webm)$/i.test(name)){
   res.writeHead(400);
   return res.end('Invalid video');
  }

  const file=path.join(videos,name);
  const out=fs.createWriteStream(file,{flags:'wx'});

  req.pipe(out);

  out.on('finish',()=>{
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify({success:true,name}));
  });

  out.on('error',()=>{
   res.writeHead(500);
   res.end('Upload failed');
  });

  return;
 }

 if(u.pathname.startsWith('/videos/')){
  let name;
  try{
   name=path.basename(decodeURIComponent(u.pathname.slice(8)));
  }catch{
   res.writeHead(400);
   return res.end();
  }

  const file=path.join(videos,name);

  if(!fs.existsSync(file)){
   res.writeHead(404);
   return res.end('Not found');
  }

  const stat=fs.statSync(file);
  const range=req.headers.range;

  res.setHeader('Accept-Ranges','bytes');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');

  if(range){
   const [a,b]=range.replace(/bytes=/,'').split('-');
   const start=Number(a);
   const end=b?Math.min(Number(b),stat.size-1):stat.size-1;

   if(!Number.isInteger(start)||start<0||start>=stat.size||end<start){
    res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});
    return res.end();
   }

   res.writeHead(206,{
    'Content-Range':`bytes ${start}-${end}/${stat.size}`,
    'Content-Length':end-start+1
   });

   return fs.createReadStream(file,{start,end}).pipe(res);
  }

  res.writeHead(200,{'Content-Length':stat.size});
  return fs.createReadStream(file).pipe(res);
 }

 const requested=u.pathname==='/'?'index.html':u.pathname.slice(1);
 const file=path.resolve(root,requested);

 if(!file.startsWith(root+path.sep)&&file!==root){
  res.writeHead(403);
  return res.end();
 }

 fs.readFile(file,(err,data)=>{
  if(err){
   res.writeHead(404);
   return res.end('Not found');
  }

  res.writeHead(200,{
   'Content-Type':mime[path.extname(file)]||'application/octet-stream'
  });

  res.end(data);
 });

}).listen(process.env.PORT || 8080,'0.0.0.0',()=>{
 console.log('NEXORA INDIA VERSION 9.0 READY');
 console.log('http://localhost:8080');
});

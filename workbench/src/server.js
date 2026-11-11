      if(req.method==='GET'&&url.pathname==='/api/rea/status')return json(res,200,await rea.discover());

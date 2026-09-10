function youtubeVideoId(value) {
  try {
    const url=new URL(String(value).trim());
    if (!['https:','http:'].includes(url.protocol) || url.username || url.password) return null;
    const host=url.hostname.toLowerCase();
    let id;
    if(host==='youtu.be') id=url.pathname.split('/')[1];
    else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)) {
      id=url.pathname==='/watch' ? url.searchParams.get('v')
        : /^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null;
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch {return null;}
}

if(typeof module!=='undefined' && module.exports) module.exports={youtubeVideoId};

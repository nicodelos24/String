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

class SongTimeline {
  constructor() {this.cues=[];}
  add(seconds, source) {
    if (String(seconds).trim()==='' || !Number.isFinite(Number(seconds)) || Number(seconds)<0 || !source) return false;
    const time=Math.round(Number(seconds)*10)/10;
    const cue={time,source,saved:{...source}};
    this.cues=this.cues.filter(item=>item.time!==time);
    this.cues.push(cue);
    this.cues.sort((a,b)=>a.time-b.time);
    return true;
  }
  at(seconds) {
    if (!Number.isFinite(seconds) || seconds<0) return null;
    let current=null;
    for(const cue of this.cues) {if(cue.time>seconds) break; current=cue;}
    return current;
  }
  remove(seconds) {this.cues=this.cues.filter(cue=>cue.time!==seconds);}
  clear() {this.cues=[];}
}

if(typeof module!=='undefined' && module.exports) module.exports={youtubeVideoId,SongTimeline};

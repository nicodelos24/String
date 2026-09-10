const {test}=require('node:test');
const assert=require('node:assert/strict');
const {youtubeVideoId,SongTimeline}=require('../song-timeline.js');

test('YouTube links accept supported hosts and reject misleading or invalid links',()=>{
  for(const link of ['https://www.youtube.com/watch?v=M7lc1UVf-VE&t=12s','https://youtu.be/M7lc1UVf-VE','https://music.youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE']) {
    assert.equal(youtubeVideoId(link),'M7lc1UVf-VE');
  }
  for(const link of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://evil.test/?v=M7lc1UVf-VE','https://youtube.com/watch?v=short','https://user@youtube.com/watch?v=M7lc1UVf-VE','not a URL']) {
    assert.equal(youtubeVideoId(link),null);
  }
});
test('timeline sorts manual cues and follows forward and backward seeks',()=>{
  const timeline=new SongTimeline();
  timeline.add(10,{root:7,type:'7',mode:'mixolydian'});
  timeline.add(2,{root:0,type:'maj7',mode:'ionian'});
  assert.equal(timeline.at(1),null);
  assert.equal(timeline.at(2).saved.root,0);
  assert.equal(timeline.at(10).saved.root,7);
  assert.equal(timeline.at(500).saved.root,7);
  assert.equal(timeline.at(3).saved.root,0);
});
test('same timestamp replaces a cue and notes stay stable after editing its source',()=>{
  const timeline=new SongTimeline();
  const source={root:2,type:'m7',mode:'dorian',ghostMode:'aeolian'};
  timeline.add(3.14,source);
  source.mode='phrygian';
  assert.equal(timeline.at(3.1).saved.mode,'dorian');
  assert.equal(timeline.at(3.1).source,source);
  timeline.add(3.1,{root:4,type:'m7',mode:'phrygian'});
  assert.equal(timeline.cues.length,1);
  assert.equal(timeline.at(3.1).saved.root,4);
});
test('invalid timestamps do not mutate the timeline and removal/clear removes cues',()=>{
  const timeline=new SongTimeline();
  const chord={root:0,type:'maj'};
  for(const value of ['',NaN,Infinity,-1,'abc']) assert.equal(timeline.add(value,chord),false);
  assert.equal(timeline.cues.length,0);
  timeline.add(0,chord); timeline.add(2,chord);
  timeline.remove(0); assert.equal(timeline.at(1),null);
  timeline.clear(); assert.equal(timeline.at(5),null);
});

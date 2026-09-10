const {test}=require('node:test');
const assert=require('node:assert/strict');
const {youtubeVideoId}=require('../youtube-url.js');

test('YouTube links accept supported hosts and reject misleading or invalid links',()=>{
  for(const link of ['https://www.youtube.com/watch?v=M7lc1UVf-VE&t=12s','https://youtu.be/M7lc1UVf-VE','https://music.youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE']) {
    assert.equal(youtubeVideoId(link),'M7lc1UVf-VE');
  }
  for(const link of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://evil.test/?v=M7lc1UVf-VE','https://youtube.com/watch?v=short','https://user@youtube.com/watch?v=M7lc1UVf-VE','not a URL']) {
    assert.equal(youtubeVideoId(link),null);
  }
});

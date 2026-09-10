// Datos versionados y almacenamiento separados de la interfaz.
class SongLibrary {
  constructor(storage, validate) {this.storage=storage; this.validate=validate; this.key='traste.songs.v1';}
  read() {
    const raw=this.storage.getItem(this.key);
    return raw === null ? [] : this.parse(raw);
  }
  parse(raw) {
    const data=JSON.parse(raw);
    if(data.version!==1 || !Array.isArray(data.songs) || data.songs.length>200) throw new Error('Formato de biblioteca no compatible.');
    const songs=data.songs.map(this.validate);
    if(new Set(songs.map(song=>song.id)).size!==songs.length) throw new Error('Hay identificadores repetidos.');
    return songs;
  }
  write(songs) {
    const raw=JSON.stringify({version:1,songs});
    this.parse(raw); // Validar antes de reemplazar cualquier dato existente.
    this.storage.setItem(this.key,raw);
  }
  save(song) {
    const songs=this.read();
    const index=songs.findIndex(item=>item.id===song.id);
    if(index<0) songs.push(song); else songs[index]=song;
    this.write(songs);
  }
  remove(id) {this.write(this.read().filter(song=>song.id!==id));}
  export() {return JSON.stringify({version:1,songs:this.read()},null,2);}
  import(raw) {
    const incoming=this.parse(raw);
    const songs=this.read();
    // Importar añade copias; nunca sobrescribe canciones existentes.
    for(const song of incoming) songs.push({...song,id:crypto.randomUUID()});
    this.write(songs);
    return incoming.length;
  }
}
if(typeof module!=='undefined' && module.exports) module.exports={SongLibrary};

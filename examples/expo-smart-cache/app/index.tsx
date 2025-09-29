import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, SafeAreaView } from 'react-native';
import { SmartCache } from '../../../dist/index';
import { ReactNativeQuickAdapter } from '../adapters/ReactNativeQuickAdapter';

export default function Home(){
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState({ fromCache:false, revalidated:false });
  const adapter = new ReactNativeQuickAdapter('smartcache.db');
  const cache = new SmartCache(adapter, { defaultTtlMs: 15000, watchChanges: false });

  const bootstrap = async () => {
    await adapter.exec(`CREATE TABLE IF NOT EXISTS clientes(id INTEGER PRIMARY KEY, nome TEXT, cidade TEXT);`);
    await adapter.exec(`INSERT INTO clientes(nome, cidade) SELECT 'Ana','Marília' WHERE NOT EXISTS(SELECT 1 FROM clientes WHERE id=1);`);
  };

  const buscar = async () => {
    const out = await cache.query('SELECT * FROM clientes WHERE cidade = ?', ['Marília'], { strategy:'cache-first' });
    setRows(out.rows);
    setMeta({ fromCache: out.fromCache, revalidated: !!out.revalidated });
  };

  useEffect(()=>{
    bootstrap().then(buscar);
  }, []);

  return (
    <SafeAreaView style={{ flex:1, padding:16, gap:12 }}>
      <View>
        <Text style={{ fontSize:18, fontWeight:'600' }}>smart-cache-sqlite • Expo Demo</Text>
        <Text>fromCache: {String(meta.fromCache)} · revalidated: {String(meta.revalidated)}</Text>
      </View>
      <Button title="Buscar (cache-first)" onPress={buscar} />
      <FlatList
        data={rows}
        keyExtractor={(item)=>String(item.id)}
        renderItem={({item}) => <View style={{ padding:8, borderBottomWidth:1, borderColor:'#eee' }}><Text>{item.id} — {item.nome} — {item.cidade}</Text></View>}
      />
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, FlatList, Button } from 'react-native';
import { SmartCache } from 'smart-cache-sqlite';
// ATENÇÃO: em RN você usará um 'adapter' próprio que fala com sqlite nativo (ex: react-native-quick-sqlite)
// Este exemplo mostra a interface esperada. Implemente um adapter compatível com ISqliteAdapter.

class RNQuickAdapter /* implements ISqliteAdapter */ {
  getDatabaseId(){ return 'rn-db'; }
  async execute(sql:string, params?:any){ /* chamar lib nativa aqui */ return []; }
  async exec(sql:string){ /* chamar lib nativa aqui */ }
}

export default function App(){
  const [rows, setRows] = useState<any[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const adapter = new RNQuickAdapter();
  const cache = new SmartCache(adapter, { defaultTtlMs: 15_000, watchChanges:false });

  const buscar = async () => {
    const out = await cache.query('SELECT * FROM clientes WHERE cidade = ?', ['Marília'], { strategy:'cache-first' });
    setRows(out.rows); setFromCache(out.fromCache);
  };

  useEffect(()=>{ buscar(); }, []);

  return (
    <SafeAreaView style={{flex:1, padding:16}}>
      <View style={{marginBottom:12}}>
        <Text style={{fontWeight:'bold'}}>smart-cache-sqlite (React Native)</Text>
        <Text>fromCache: {String(fromCache)}</Text>
      </View>
      <Button title="Recarregar" onPress={buscar}/>
      <FlatList
        data={rows}
        keyExtractor={(item)=>String(item.id)}
        renderItem={({item}) => (<View style={{padding:8, borderBottomWidth:1}}><Text>{item.nome} — {item.cidade}</Text></View>)}
      />
    </SafeAreaView>
  );
}

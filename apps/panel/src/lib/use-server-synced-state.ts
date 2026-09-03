'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Sunucudan gelen veriyi baslangic degeri olarak alir, Realtime olaylariyla
 * yerinde guncellenmesine izin verir, ama sunucu yeni bir veri gonderdiginde
 * (revalidate veya yeniden gezinme) onu benimser.
 *
 * Neden efekt degil: `useEffect(() => setState(prop), [prop])` yazmak akla
 * ilk gelen cozum ama React bunu onermiyor -- once eski veriyle bir render
 * yapilip ardindan ikinci bir render tetikleniyor, yani ekranda bir kare
 * boyunca bayat veri gorunuyor. Render sirasinda ayarlama yapmak React'in
 * bu is icin belgelenmis deseni: React degisikligi fark edip bilesenin
 * ciktisini DOM'a hic yazmadan yeniden calistiriyor.
 *
 * Karsilastirma referans esitligiyle yapiliyor. Sunucu her cevabinda yeni
 * bir dizi/nesne uretiyor, dolayisiyla "sunucu konustu" sinyali olarak bu
 * yeterli; degerin icerigini derin karsilastirmaya gerek yok.
 */
export function useServerSyncedState<T>(
  fromServer: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(fromServer)
  const [seen, setSeen] = useState(fromServer)

  if (fromServer !== seen) {
    setSeen(fromServer)
    setValue(fromServer)
  }

  return [value, setValue]
}

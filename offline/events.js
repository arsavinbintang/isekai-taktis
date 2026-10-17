const EVENTS = [
  {
    id: 1,
    name: 'Pasokan Hilang di Dataran Abu',
    desc: 'Sebuah karavan pembawa obat terjebak di padang abu. Bantu mereka, dan pasukanmu kebagian jatah.',
    syarat: 13,
    aktif: 1,
    skenario: '@bg field\nNarator: Karavan kecil itu berhenti di tengah padang abu, roda belakangnya patah.\nPedagang: Tolong! Obat-obatan ini untuk kamp pengungsi!\nValerius: Aria, ambil keretanya. Elysia, cari tahu siapa yang merusak roda ini.\nNarator: Setelah setengah hari, karavan itu kembali berjalan di bawah pengawalan.\nPedang: Ambil ini. Kami tak bisa membayar, tapi kami tak akan lupa.',
    hadiah: [
      { tipe: 'uang', jumlah: 600 },
      { tipe: 'hero', id: 6 },
      { tipe: 'matauang', id: 1, jumlah: 25 }
    ],
    shop: {
      aktif: 1,
      mata: 1,
      item: [
        { judul: 'Paket Permata', tipe: 'uang', id: 0, jumlah: 300, harga: 20 },
        { judul: 'Elysia, Penenun Hampa', tipe: 'hero', id: 2, jumlah: 0, harga: 60 },
        { judul: 'Kapak Rimba', tipe: 'senjata', id: 8, jumlah: 0, harga: 45 }
      ]
    }
  },
  {
    id: 2,
    name: 'Turnamen Batu Merah',
    desc: 'Balai kota mengadakan turnamen terbuka. Menang, dan hadiahnya milikmu.',
    syarat: 40,
    aktif: 1,
    skenario: '@bg ruins\nNarator: Lapangan Batu Merah dipenuhi penonton. Terompet bambu berbunyi tiga kali.\nJagoan Lokal: Siapa yang berani naik?\nDraken: Aku. Tanpa aturan, tanpa wasit, tanpa drama.\nNarator: Tiga ronde, tiga kemenangan, satu penonton yang mulai memasang taruhan salah.\nJagoan Lokal: Kau boleh ambil piala. Dan pekerjaan ini.',
    hadiah: [
      { tipe: 'uang', jumlah: 900 },
      { tipe: 'senjata', id: 12 },
      { tipe: 'matauang', id: 1, jumlah: 40 }
    ],
    shop: {
      aktif: 1,
      mata: 1,
      item: [
        { judul: 'Paket Permata', tipe: 'uang', id: 0, jumlah: 800, harga: 40 },
        { judul: 'Thorn, Bayangan Senja', tipe: 'hero', id: 12, jumlah: 0, harga: 120 },
        { judul: 'Belati Sunyi', tipe: 'senjata', id: 13, jumlah: 0, harga: 70 }
      ]
    }
  },
  {
    id: 3,
    name: 'Kafilah Emas Kekaisaran',
    desc: 'Kafilah harta Kekaisaran lewat tanpa pengawal penuh. Kesempatan terlalu bagus untuk dilewat.',
    syarat: 80,
    aktif: 1,
    skenario: '@bg night\nNarator: Di malam tanpa bulan, rombongan peti emas melintas jalur tikus.\nSylas: Pengawalnya delapan. Kita lima. Angka yang menyenangkan.\nElysia: Aku suka matematika ketika hasilnya menguntungkan.\nNarator: Serangan berlangsung singkat dan sunyi, tanpa satu pun terompet.\nValerius: Bagikan sebagian ke desa-desa yang dibakar. Sisanya untuk perang.',
    hadiah: [
      { tipe: 'uang', jumlah: 1500 },
      { tipe: 'hero', id: 13 }
    ]
  },
  {
    id: 4,
    name: 'Arsenal yang Ditinggalkan',
    desc: 'Sebuah gudang senjata lama Kekaisaran ditemukan terkubur di reruntuhan menara.',
    syarat: 120,
    aktif: 1,
    skenario: '@bg ruins\nNarator: Pintu besi itu terbuka dengan jeritan karat yang memekakkan.\nBastian: Lima ratus pasak. Semuanya masih tajam.\nGarruk: Artinya seseorang pernah merencanakan perang yang jauh lebih besar.\nValerius: Maka kita ambil sebelum mereka melakukannya.',
    hadiah: [
      { tipe: 'senjata', id: 17 },
      { tipe: 'senjata', id: 21 },
      { tipe: 'uang', jumlah: 800 }
    ]
  },
  {
    id: 5,
    name: 'Fajar Terakhir di Kaldera',
    desc: 'Sebelum benteng terakhir, seluruh aliansi berkumpul untuk satu pesta perang terakhir.',
    syarat: 187,
    aktif: 1,
    skenario: '@bg camp\nNarator: Api unggun sepanjang kaldera, dan tidak ada satu pun yang menjaga gerbang malam itu.\nGarruk: Satu malam. Kita hanya minta satu malam.\nAria: Kalian boleh tertawa keras. Nanti sakit tenggorokan.\nElysia: Aku akan menyanyi. Semua yang hadir menutup telinga.\nValerius: (tertawa) Besok kita berjalan ke gerbang itu. Malam ini, kita hanya manusia.\nNarator: Dan untuk pertama kalinya sejak perang dimulai, mereka semua tertawa.',
    hadiah: [
      { tipe: 'uang', jumlah: 2500 },
      { tipe: 'hero', id: 24 },
      { tipe: 'senjata', id: 25 }
    ]
  }
];
globalThis.EVENTS = EVENTS;

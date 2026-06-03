<?php
$host = 'localhost';
$db   = 'jasuke_db';
$user = 'root';
$pass = '';
$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

$pesan = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nama     = $_POST['nama'];
    $whatsapp = $_POST['whatsapp'];
    $menu     = $_POST['menu'];
    $jumlah   = $_POST['jumlah'];
    $alamat   = $_POST['alamat'];
    $catatan  = $_POST['catatan'];

    $sql = "INSERT INTO pesanan (nama, whatsapp, menu, jumlah, alamat, catatan)
            VALUES ('$nama', '$whatsapp', '$menu', '$jumlah', '$alamat', '$catatan')";

    if ($conn->query($sql) === TRUE) {
        $pesan = "SUCCESS";
    } else {
        $pesan = "ERROR: " . $conn->error;
    }
}

$result = $conn->query("SELECT * FROM pesanan ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pesanan - Jasuke Maz D</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Poppins',sans-serif; background:#fff8e1; }
    .navbar {
      position:fixed; top:0; width:100%;
      background:rgba(255,255,255,0.95);
      display:flex; justify-content:space-between; align-items:center;
      padding:12px 50px; z-index:999;
      box-shadow:0 4px 20px rgba(230,81,0,0.12);
    }
    .navbar img { height:50px; }
    .navbar ul { list-style:none; display:flex; gap:10px; }
    .navbar ul li a {
      text-decoration:none; color:#444;
      font-weight:600; padding:8px 18px;
      border-radius:30px; transition:all 0.3s;
    }
    .navbar ul li a:hover, .navbar ul li a.active {
      background:#ff6f00; color:white;
    }
    .container { max-width:700px; margin:120px auto 60px; padding:0 20px; }
    h2 { font-size:2rem; color:#333; margin-bottom:30px; text-align:center; }
    .form-box {
      background:white; border-radius:20px;
      padding:40px; box-shadow:0 4px 24px rgba(255,111,0,0.1);
      margin-bottom:40px;
    }
    .form-group { margin-bottom:20px; }
    label { display:block; font-weight:600; margin-bottom:8px; color:#444; }
    input, select, textarea {
      width:100%; padding:12px 16px;
      border:2px solid #ffe0b2; border-radius:10px;
      font-family:'Poppins',sans-serif; font-size:0.95rem;
      transition:border 0.3s;
    }
    input:focus, select:focus, textarea:focus {
      outline:none; border-color:#ff6f00;
    }
    .btn-submit {
      width:100%; padding:14px;
      background:#ff6f00; color:white;
      border:none; border-radius:50px;
      font-size:1rem; font-weight:700;
      cursor:pointer; transition:all 0.3s;
    }
    .btn-submit:hover { background:#e65100; }
    .alert-success {
      background:#e8f5e9; color:#2e7d32;
      padding:15px 20px; border-radius:10px;
      margin-bottom:20px; font-weight:600;
      text-align:center;
    }
    .table-box {
      background:white; border-radius:20px;
      padding:30px; box-shadow:0 4px 24px rgba(255,111,0,0.1);
    }
    .table-box h3 { margin-bottom:20px; color:#ff6f00; }
    table { width:100%; border-collapse:collapse; font-size:0.85rem; }
    th { background:#ff6f00; color:white; padding:10px; text-align:left; }
    td { padding:10px; border-bottom:1px solid #ffe0b2; }
    tr:hover { background:#fff8e1; }
    footer {
      background:#1a1a1a; color:#aaa;
      text-align:center; padding:20px;
      font-size:0.85rem;
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <a href="index.html">
      <img src="Jagung.png" alt="Logo">
    </a>
    <ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="produk.html">Produk</a></li>
      <li><a href="pesanan.php" class="active">Pesanan</a></li>
      <li><a href="kontak.html">Kontak</a></li>
    </ul>
  </nav>

  <div class="container">
    <h2>🛒 Form Pesanan</h2>

    <?php if ($pesan == "SUCCESS"): ?>
      <div class="alert-success">✅ Pesanan berhasil disimpan!</div>
    <?php elseif ($pesan != ""): ?>
      <div style="background:#ffebee;color:#c62828;padding:15px;border-radius:10px;margin-bottom:20px;">
        ❌ <?= $pesan ?>
      </div>
    <?php endif; ?>

    <div class="form-box">
      <form method="POST" action="pesanan.php">
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" name="nama" placeholder="Masukkan nama lengkap" required>
        </div>
        <div class="form-group">
          <label>Nomor WhatsApp</label>
          <input type="text" name="whatsapp" placeholder="Contoh: 08123456789" required>
        </div>
        <div class="form-group">
          <label>Pilih Menu</label>
          <select name="menu" required>
            <option value="">-- Pilih Menu --</option>
            <option value="Jasuke Original">Jasuke Original - Rp 10.000</option>
            <option value="Keju Coklat">Keju Coklat - Rp 12.000</option>
            <option value="Coklat Milo">Coklat Milo - Rp 12.000</option>
            <option value="Kemasan Milo">Kemasan Milo - Rp 12.000</option>
            <option value="Coklat Original">Coklat Original - Rp 12.000</option>
          </select>
        </div>
        <div class="form-group">
          <label>Jumlah</label>
          <input type="number" name="jumlah" min="1" value="1" required>
        </div>
        <div class="form-group">
          <label>Alamat Pengiriman</label>
          <textarea name="alamat" rows="3" placeholder="Masukkan alamat lengkap" required></textarea>
        </div>
        <div class="form-group">
          <label>Catatan (opsional)</label>
          <textarea name="catatan" rows="2" placeholder="Catatan tambahan..."></textarea>
        </div>
        <button type="submit" class="btn-submit">🛒 Kirim Pesanan</button>
      </form>
    </div>

    <div class="table-box">
      <h3>📋 Daftar Pesanan Masuk</h3>
      <table>
        <tr>
          <th>No</th>
          <th>Nama</th>
          <th>Menu</th>
          <th>Jumlah</th>
          <th>WA</th>
          <th>Waktu</th>
        </tr>
        <?php
        $no = 1;
        while($row = $result->fetch_assoc()):
        ?>
        <tr>
          <td><?= $no++ ?></td>
          <td><?= htmlspecialchars($row['nama']) ?></td>
          <td><?= htmlspecialchars($row['menu']) ?></td>
          <td><?= $row['jumlah'] ?></td>
          <td><?= htmlspecialchars($row['whatsapp']) ?></td>
          <td><?= $row['created_at'] ?></td>
        </tr>
        <?php endwhile; ?>
      </table>
    </div>
  </div>

  <footer>© 2025 Jasuke Maz D · All Rights Reserved</footer>
</body>
</html>
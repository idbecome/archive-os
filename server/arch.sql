-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 05, 2026 at 02:58 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `archive_os`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `seed_inventory` ()   BEGIN
    DECLARE i INT DEFAULT 1;
    WHILE i <= 100 DO
        INSERT IGNORE INTO inventory (id, status, box_data, history) VALUES (i, 'EMPTY', NULL, '[]');
        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`) VALUES
(5, 'Finance'),
(4, 'General'),
(3, 'HR'),
(1, 'IT'),
(2, 'Warehouse');

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` varchar(50) NOT NULL,
  `title` varchar(500) DEFAULT NULL,
  `upload_date` datetime DEFAULT NULL,
  `version` int(11) DEFAULT NULL,
  `ocr_content` longtext DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `uploader` varchar(100) DEFAULT NULL,
  `locked` tinyint(1) DEFAULT NULL,
  `versions_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`versions_history`)),
  `uploadDate` datetime DEFAULT NULL,
  `ocrContent` longtext DEFAULT NULL,
  `folderId` varchar(255) DEFAULT NULL,
  `fileData` longtext DEFAULT NULL,
  `url` text DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `owner` varchar(100) DEFAULT NULL,
  `auditId` varchar(255) DEFAULT NULL,
  `stepIndex` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `title`, `upload_date`, `version`, `ocr_content`, `size`, `type`, `uploader`, `locked`, `versions_history`, `uploadDate`, `ocrContent`, `folderId`, `fileData`, `url`, `department`, `owner`, `auditId`, `stepIndex`) VALUES
('1770120145515', 'detail (1).pdf', NULL, NULL, NULL, '0.40 MB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 12:02:25', '[RINGKASAN]\nTotal Karakter: 1432\nStatus OCR: Berhasil\n\n[ANALISIS DOKUMEN DIGITAL]\nNama File: detail (1).pdf\nJudul Meta: LAPORAN KAS UTAMA - ALL (2).xlsx\n------------------------------------------------\n\n[EKSTRAKSI TEKS ISI]\n--- Halaman 1 ---\nHUMAS   JAN   FEB   MAR   APR   MEI   JUN   JUL   AGST   SEP   OKT   NOV   DES  BERJALAN  1   25   22   23   24   21   21   16   18   17   17   17  2   38   41   39   31   33   31   32   33   34   32   36  3   31   29   25   23   29   20   23   19   24   22   21  4   33   32   35   6   23   23   23   6   9   25   27  BULAN LALU  1   2   5   6   2   6   3   12   3   16   9  2   5   4   3   11   4   8   11   10   6   9  3   4   7   6   21   3   10   11   16   13   11  4   10   12   0   29   12   18   8   19   33   11  TOTAL BULAN   127   145   150   99   169   120   133   118   132   164   141  TOTAL UANG   6,985,000 Rp   7,975,000 Rp   8,250,000 Rp   5,445,000 Rp   9,295,000 Rp   6,600,000 Rp   7,315,000 Rp   6,490,000 Rp   7,260,000 Rp   9,020,000 Rp   7,755,000 Rp  SETOR RT   5,715,000 Rp   6,525,000 Rp   6,750,000 Rp   4,455,000 Rp   7,605,000 Rp   5,400,000 Rp   5,985,000 Rp   5,310,000 Rp   5,940,000 Rp   7,380,000 Rp   6,345,000 Rp  UANG KAS   1,270,000 Rp   1,450,000 Rp   1,500,000 Rp   990,000 Rp   1,690,000 Rp   1,200,000 Rp   1,330,000 Rp   1,180,000 Rp   1,320,000 Rp   1,640,000 Rp   1,410,000 Rp  Keterangan   Rata Rata  TOTAL UANG   7,490,000 Rp  SETOR RT   6,128,182 Rp  UANG KAS   1,361,818 Rp  Keterangan   Minimal Setor  TOTAL UANG   5,445,000 Rp  SETOR RT   4,455,000 Rp  UANG KAS   990,000 Rp  Keterangan   Maximal Setor  TOTAL UANG   9,295,000 Rp  SETOR RT   7,605,000 Rp  UANG KAS   1,690,000 Rp\n\n', '1', NULL, NULL, NULL, NULL, NULL, NULL),
('1770126359033', 'detail (1) (6).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:45:59', NULL, '2', NULL, NULL, 'Tax', 'Administrator', '1770125447817', 1),
('1770126388399', 'detail (1) (3).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:46:28', NULL, '3', NULL, NULL, 'Tax', 'Administrator', '1770126382836', 1),
('1770126438073', 'detail (1) (3).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:47:18', 'Initial attachment', '4', NULL, NULL, 'Tax', 'Administrator', '1770126438046', 0),
('1770126460371', 'detail (1) (3) (1).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:47:40', NULL, '4', NULL, NULL, 'Tax', 'Administrator', '1770126438046', 1),
('1770126697032', 'detail (1) (7).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:51:37', 'Initial attachment', '5', NULL, NULL, 'Tax', 'Administrator', '1770126697004', 0),
('1770127418655_774', 'Copy of detail (1).pdf', NULL, NULL, NULL, '0.40 MB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 14:03:38', '[RINGKASAN]\nTotal Karakter: 1432\nStatus OCR: Berhasil\n\n[ANALISIS DOKUMEN DIGITAL]\nNama File: detail (1).pdf\nJudul Meta: LAPORAN KAS UTAMA - ALL (2).xlsx\n------------------------------------------------\n\n[EKSTRAKSI TEKS ISI]\n--- Halaman 1 ---\nHUMAS   JAN   FEB   MAR   APR   MEI   JUN   JUL   AGST   SEP   OKT   NOV   DES  BERJALAN  1   25   22   23   24   21   21   16   18   17   17   17  2   38   41   39   31   33   31   32   33   34   32   36  3   31   29   25   23   29   20   23   19   24   22   21  4   33   32   35   6   23   23   23   6   9   25   27  BULAN LALU  1   2   5   6   2   6   3   12   3   16   9  2   5   4   3   11   4   8   11   10   6   9  3   4   7   6   21   3   10   11   16   13   11  4   10   12   0   29   12   18   8   19   33   11  TOTAL BULAN   127   145   150   99   169   120   133   118   132   164   141  TOTAL UANG   6,985,000 Rp   7,975,000 Rp   8,250,000 Rp   5,445,000 Rp   9,295,000 Rp   6,600,000 Rp   7,315,000 Rp   6,490,000 Rp   7,260,000 Rp   9,020,000 Rp   7,755,000 Rp  SETOR RT   5,715,000 Rp   6,525,000 Rp   6,750,000 Rp   4,455,000 Rp   7,605,000 Rp   5,400,000 Rp   5,985,000 Rp   5,310,000 Rp   5,940,000 Rp   7,380,000 Rp   6,345,000 Rp  UANG KAS   1,270,000 Rp   1,450,000 Rp   1,500,000 Rp   990,000 Rp   1,690,000 Rp   1,200,000 Rp   1,330,000 Rp   1,180,000 Rp   1,320,000 Rp   1,640,000 Rp   1,410,000 Rp  Keterangan   Rata Rata  TOTAL UANG   7,490,000 Rp  SETOR RT   6,128,182 Rp  UANG KAS   1,361,818 Rp  Keterangan   Minimal Setor  TOTAL UANG   5,445,000 Rp  SETOR RT   4,455,000 Rp  UANG KAS   990,000 Rp  Keterangan   Maximal Setor  TOTAL UANG   9,295,000 Rp  SETOR RT   7,605,000 Rp  UANG KAS   1,690,000 Rp\n\n', '5', NULL, NULL, NULL, NULL, NULL, NULL),
('1770293023770_450', 'Copy of detail (1).pdf', NULL, NULL, NULL, '0.40 MB', 'application/pdf', NULL, NULL, NULL, '2026-02-05 12:03:43', '[RINGKASAN]\nTotal Karakter: 1432\nStatus OCR: Berhasil\n\n[ANALISIS DOKUMEN DIGITAL]\nNama File: detail (1).pdf\nJudul Meta: LAPORAN KAS UTAMA - ALL (2).xlsx\n------------------------------------------------\n\n[EKSTRAKSI TEKS ISI]\n--- Halaman 1 ---\nHUMAS   JAN   FEB   MAR   APR   MEI   JUN   JUL   AGST   SEP   OKT   NOV   DES  BERJALAN  1   25   22   23   24   21   21   16   18   17   17   17  2   38   41   39   31   33   31   32   33   34   32   36  3   31   29   25   23   29   20   23   19   24   22   21  4   33   32   35   6   23   23   23   6   9   25   27  BULAN LALU  1   2   5   6   2   6   3   12   3   16   9  2   5   4   3   11   4   8   11   10   6   9  3   4   7   6   21   3   10   11   16   13   11  4   10   12   0   29   12   18   8   19   33   11  TOTAL BULAN   127   145   150   99   169   120   133   118   132   164   141  TOTAL UANG   6,985,000 Rp   7,975,000 Rp   8,250,000 Rp   5,445,000 Rp   9,295,000 Rp   6,600,000 Rp   7,315,000 Rp   6,490,000 Rp   7,260,000 Rp   9,020,000 Rp   7,755,000 Rp  SETOR RT   5,715,000 Rp   6,525,000 Rp   6,750,000 Rp   4,455,000 Rp   7,605,000 Rp   5,400,000 Rp   5,985,000 Rp   5,310,000 Rp   5,940,000 Rp   7,380,000 Rp   6,345,000 Rp  UANG KAS   1,270,000 Rp   1,450,000 Rp   1,500,000 Rp   990,000 Rp   1,690,000 Rp   1,200,000 Rp   1,330,000 Rp   1,180,000 Rp   1,320,000 Rp   1,640,000 Rp   1,410,000 Rp  Keterangan   Rata Rata  TOTAL UANG   7,490,000 Rp  SETOR RT   6,128,182 Rp  UANG KAS   1,361,818 Rp  Keterangan   Minimal Setor  TOTAL UANG   5,445,000 Rp  SETOR RT   4,455,000 Rp  UANG KAS   990,000 Rp  Keterangan   Maximal Setor  TOTAL UANG   9,295,000 Rp  SETOR RT   7,605,000 Rp  UANG KAS   1,690,000 Rp\n\n', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `external_items`
--

CREATE TABLE `external_items` (
  `id` int(11) NOT NULL,
  `boxId` varchar(100) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `sentDate` datetime DEFAULT NULL,
  `sender` varchar(100) DEFAULT NULL,
  `boxData` text DEFAULT NULL,
  `history` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `external_items`
--

INSERT INTO `external_items` (`id`, `boxId`, `destination`, `sentDate`, `sender`, `boxData`, `history`) VALUES
(1, 'BOX-2024-002', 'Indoarsip', '2026-02-04 12:25:06', 'Administrator', '{\"id\":\"BOX-2024-002\",\"ordners\":[{\"id\":1770119429369,\"noOrdner\":\"ORD-002\",\"period\":\"Jan 2024\",\"invoices\":[{\"id\":1770119429369.8174,\"invoiceNo\":\"INV/002\",\"vendor\":\"Vendor B\",\"paymentDate\":\"2024-01-31\"}]}]}', '[{\"id\":1770120966260,\"timestamp\":\"2026-02-03T12:16:06.260Z\",\"action\":\"MOVED\",\"note\":\"Pindahan dr Slot #2\",\"user\":\"Administrator\"},{\"id\":1770120978128,\"timestamp\":\"2026-02-03T12:16:18.128Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770120980872,\"timestamp\":\"2026-02-03T12:16:20.872Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770120982686,\"timestamp\":\"2026-02-03T12:16:22.686Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207898093,\"timestamp\":\"2026-02-04T12:24:58.093Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770207900041,\"timestamp\":\"2026-02-04T12:25:00.041Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207902983,\"timestamp\":\"2026-02-04T12:25:02.983Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"}]'),
(2, 'BOX-2024-002', 'Indoarsip', '2026-02-04 12:25:44', 'Administrator', '{\"id\":\"BOX-2024-002\",\"ordners\":[{\"id\":1770119429369,\"noOrdner\":\"ORD-002\",\"period\":\"Jan 2024\",\"invoices\":[{\"id\":1770119429369.8174,\"invoiceNo\":\"INV/002\",\"vendor\":\"Vendor B\",\"paymentDate\":\"2024-01-31\"}]}]}', '[{\"id\":1770120966260,\"timestamp\":\"2026-02-03T12:16:06.260Z\",\"action\":\"MOVED\",\"note\":\"Pindahan dr Slot #2\",\"user\":\"Administrator\"},{\"id\":1770120978128,\"timestamp\":\"2026-02-03T12:16:18.128Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770120980872,\"timestamp\":\"2026-02-03T12:16:20.872Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770120982686,\"timestamp\":\"2026-02-03T12:16:22.686Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207898093,\"timestamp\":\"2026-02-04T12:24:58.093Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770207900041,\"timestamp\":\"2026-02-04T12:25:00.041Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207902983,\"timestamp\":\"2026-02-04T12:25:02.983Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"}]');

-- --------------------------------------------------------

--
-- Table structure for table `folders`
--

CREATE TABLE `folders` (
  `id` int(11) NOT NULL,
  `parentId` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `privacy` varchar(50) DEFAULT NULL,
  `allowedDepts` text DEFAULT NULL,
  `allowedUsers` text DEFAULT NULL,
  `owner` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `folders`
--

INSERT INTO `folders` (`id`, `parentId`, `name`, `privacy`, `allowedDepts`, `allowedUsers`, `owner`, `createdAt`) VALUES
(1, NULL, 'TAX', NULL, NULL, NULL, NULL, '2026-02-05 18:13:06'),
(5, NULL, 'Pemeriksaan - Tax ppn 2025', 'private', '[]', '[]', 'Administrator', '2026-02-05 18:13:06');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `status` varchar(50) DEFAULT 'EMPTY',
  `box_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`box_data`)),
  `history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`history`)),
  `last_updated` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `boxData` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `status`, `box_data`, `history`, `last_updated`, `lastUpdated`, `boxData`) VALUES
(1, 'STORED', NULL, '[{\"id\":1770119159691,\"timestamp\":\"2026-02-03T11:45:59.691Z\",\"action\":\"IMPORTED\",\"note\":\"Import: BOX-2024-001\",\"user\":\"Administrator\"},{\"id\":1770119401255,\"timestamp\":\"2026-02-03T11:50:01.255Z\",\"action\":\"REMOVED\",\"note\":\"Dikosongkan manual\",\"user\":\"Administrator\"},{\"id\":1770119429361,\"timestamp\":\"2026-02-03T11:50:29.361Z\",\"action\":\"IMPORTED\",\"note\":\"Import: BOX-2024-001\",\"user\":\"Administrator\"},{\"id\":1770207127561,\"timestamp\":\"2026-02-04T12:12:07.561Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770207129592,\"timestamp\":\"2026-02-04T12:12:09.592Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"}]', NULL, '2026-02-04 12:12:09', '{\"id\":\"BOX-2024-001\",\"ordners\":[{\"id\":1770119429361,\"noOrdner\":\"ORD-001\",\"period\":\"Jan 2024\",\"invoices\":[{\"id\":1770119429361.5493,\"invoiceNo\":\"INV/001\",\"vendor\":\"Vendor A\",\"paymentDate\":\"2024-01-31\"}]}]}'),
(2, 'STORED', NULL, '[{\"id\":1770120966260,\"timestamp\":\"2026-02-03T12:16:06.260Z\",\"action\":\"MOVED\",\"note\":\"Pindahan dr Slot #2\",\"user\":\"Administrator\"},{\"id\":1770120978128,\"timestamp\":\"2026-02-03T12:16:18.128Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770120980872,\"timestamp\":\"2026-02-03T12:16:20.872Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770120982686,\"timestamp\":\"2026-02-03T12:16:22.686Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207898093,\"timestamp\":\"2026-02-04T12:24:58.093Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770207900041,\"timestamp\":\"2026-02-04T12:25:00.041Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207902983,\"timestamp\":\"2026-02-04T12:25:02.983Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770289679439,\"timestamp\":\"2026-02-05T11:07:59.439Z\",\"action\":\"RESTORED\",\"note\":\"Dikembalikan dari Indoarsip\",\"user\":\"Administrator\"}]', NULL, '2026-02-05 11:07:59', '{\"id\":\"BOX-2024-002\",\"ordners\":[{\"id\":1770119429369,\"noOrdner\":\"ORD-002\",\"period\":\"Jan 2024\",\"invoices\":[{\"id\":1770119429369.8174,\"invoiceNo\":\"INV/002\",\"vendor\":\"Vendor B\",\"paymentDate\":\"2024-01-31\"}]}]}'),
(3, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(4, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(5, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(6, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(7, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(8, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(9, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(10, 'EMPTY', NULL, '[{\"id\":1770120966260,\"timestamp\":\"2026-02-03T12:16:06.260Z\",\"action\":\"MOVED\",\"note\":\"Pindahan dr Slot #2\",\"user\":\"Administrator\"},{\"id\":1770120978128,\"timestamp\":\"2026-02-03T12:16:18.128Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770120980872,\"timestamp\":\"2026-02-03T12:16:20.872Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770120982686,\"timestamp\":\"2026-02-03T12:16:22.686Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207898093,\"timestamp\":\"2026-02-04T12:24:58.093Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770207900041,\"timestamp\":\"2026-02-04T12:25:00.041Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207902983,\"timestamp\":\"2026-02-04T12:25:02.983Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770208057999,\"timestamp\":\"2026-02-04T12:27:37.999Z\",\"action\":\"EXTERNAL\",\"note\":\"Dikirim ke Indoarsip\",\"user\":\"Administrator\"}]', NULL, '2026-02-04 12:27:37', 'null'),
(11, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(12, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(13, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(14, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(15, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(16, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(17, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(18, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(19, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(20, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(21, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(22, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(23, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(24, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(25, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(26, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(27, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(28, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(29, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(30, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(31, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(32, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(33, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(34, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(35, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(36, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(37, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(38, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(39, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(40, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(41, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(42, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(43, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(44, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(45, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(46, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(47, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(48, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(49, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(50, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(51, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(52, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(53, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(54, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(55, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(56, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(57, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(58, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(59, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(60, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(61, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(62, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(63, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(64, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(65, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(66, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(67, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(68, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(69, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(70, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(71, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(72, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(73, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(74, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(75, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(76, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(77, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(78, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(79, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(80, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(81, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(82, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(83, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(84, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(85, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(86, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(87, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(88, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(89, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(90, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(91, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(92, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(93, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(94, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(95, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(96, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(97, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(98, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(99, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(100, 'EMPTY', NULL, '[]', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `logs`
--

CREATE TABLE `logs` (
  `id` int(11) NOT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `user` varchar(100) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `logs`
--

INSERT INTO `logs` (`id`, `timestamp`, `user`, `action`, `details`) VALUES
(1, '2026-02-03 14:23:27', 'System', 'Move', 'Pindah file ID: 1770127418655_774 ke folder: Root'),
(2, '2026-02-04 11:05:54', 'Administrator', 'Logout', 'User logged out'),
(3, '2026-02-04 11:06:05', 'Admin', 'Login', 'Admin logged in'),
(4, '2026-02-04 11:37:27', 'Administrator', 'Logout', 'User logged out'),
(5, '2026-02-04 11:37:32', 'Admin', 'Login', 'Admin logged in'),
(6, '2026-02-04 11:37:47', 'Administrator', 'Logout', 'User logged out'),
(7, '2026-02-04 11:37:51', 'Admin', 'Login', 'Admin logged in'),
(8, '2026-02-04 11:41:44', 'Administrator', 'Logout', 'User logged out'),
(9, '2026-02-04 11:41:49', 'Admin', 'Login', 'Admin logged in'),
(10, '2026-02-04 11:48:31', 'Administrator', 'Update Role', 'Nama: Akunting'),
(11, '2026-02-04 11:59:32', 'Administrator', 'Update User', 'viewer'),
(12, '2026-02-04 11:59:33', 'Administrator', 'Logout', 'User logged out'),
(13, '2026-02-04 11:59:47', 'Admin', 'Login', 'Admin logged in'),
(14, '2026-02-04 11:59:57', 'Administrator', 'Update User', 'tamu'),
(15, '2026-02-04 11:59:59', 'Administrator', 'Logout', 'User logged out'),
(16, '2026-02-04 12:00:03', 'Tamu', 'Login', 'User logged in'),
(17, '2026-02-04 12:08:51', 'Tamu', 'Logout', 'User logged out'),
(18, '2026-02-04 12:08:55', 'Admin', 'Login', 'Admin logged in'),
(19, '2026-02-04 12:12:07', 'Administrator', 'Ubah Status', 'Slot #1 status: Dipinjam User'),
(20, '2026-02-04 12:12:09', 'Administrator', 'Ubah Status', 'Slot #1 status: Dikembalikan User'),
(21, '2026-02-04 12:13:22', 'Administrator', 'Cetak Label', 'Mencetak label untuk Kardus: BOX-2024-001'),
(22, '2026-02-04 12:15:42', 'Administrator', 'Logout', 'User logged out'),
(23, '2026-02-04 12:15:46', 'Tamu', 'Login', 'User logged in'),
(24, '2026-02-04 12:15:52', 'Tamu', 'Logout', 'User logged out'),
(25, '2026-02-04 12:15:58', 'Admin', 'Login', 'Admin logged in'),
(26, '2026-02-04 12:24:58', 'Administrator', 'Ubah Status', 'Slot #10 status: Dikembalikan User'),
(27, '2026-02-04 12:25:00', 'Administrator', 'Ubah Status', 'Slot #10 status: Sedang Audit'),
(28, '2026-02-04 12:25:02', 'Administrator', 'Ubah Status', 'Slot #10 status: Dikembalikan User'),
(29, '2026-02-04 12:27:38', 'Administrator', 'Barang Keluar', 'Kardus ke Indoarsip'),
(30, '2026-02-04 12:35:33', 'Administrator', 'Export Excel', 'Download laporan inventory info'),
(31, '2026-02-05 11:07:59', 'Administrator', 'Barang Masuk (Restore)', 'Restore BOX-2024-002 dari Indoarsip'),
(32, '2026-02-05 11:09:40', 'System', 'Move', 'Pindah file ID: 1770127418655_774 ke folder: 5'),
(33, '2026-02-05 11:10:03', 'Administrator', 'Logout', 'User logged out'),
(34, '2026-02-05 11:10:09', 'Tamu', 'Login', 'User logged in'),
(35, '2026-02-05 11:10:39', 'Tamu', 'Logout', 'User logged out'),
(36, '2026-02-05 11:10:45', 'Administrator', 'Login', 'User logged in'),
(37, '2026-02-05 11:18:40', 'System', 'Folder', 'Update folder: \"Pemeriksaan - Tax ppn 2025\"'),
(38, '2026-02-05 11:18:40', 'Administrator', 'Update Folder', 'undefined -> Pemeriksaan - Tax ppn 2025'),
(39, '2026-02-05 11:18:42', 'Administrator', 'Logout', 'User logged out'),
(40, '2026-02-05 11:18:46', 'Tamu', 'Login', 'User logged in'),
(41, '2026-02-05 11:18:49', 'Tamu', 'Logout', 'User logged out'),
(42, '2026-02-05 11:18:53', 'Administrator', 'Login', 'User logged in'),
(43, '2026-02-05 12:03:43', 'System', 'Copy', 'Salin file: \"detail (1).pdf\" ke folder: Root'),
(44, '2026-02-05 13:07:22', 'Administrator', 'Create Pajak', 'Januari 2026'),
(45, '2026-02-05 13:09:27', 'Administrator', 'Create Pajak', 'Januari 2026'),
(46, '2026-02-05 13:20:50', 'Administrator', 'Create Pajak', 'Januari 2026'),
(47, '2026-02-05 13:25:41', 'Administrator', 'Create Pajak', 'undefined - Januari 2026'),
(48, '2026-02-05 13:30:43', 'Administrator', 'Create Pajak', 'PPN - Januari 2026'),
(49, '2026-02-05 13:32:24', 'Administrator', 'Create Pajak', 'PPN - Februari 2026'),
(50, '2026-02-05 13:35:38', 'Administrator', 'Create Pajak', 'PPH - Januari 2026'),
(51, '2026-02-05 13:50:42', 'Administrator', 'Logout', 'User logged out'),
(52, '2026-02-05 13:51:09', 'Administrator', 'Login', 'User logged in'),
(53, '2026-02-05 13:51:25', 'Administrator', 'Logout', 'User logged out'),
(54, '2026-02-05 13:51:46', 'Administrator', 'Login', 'User logged in'),
(55, '2026-02-05 13:52:13', 'Administrator', 'Logout', 'User logged out'),
(56, '2026-02-05 13:52:37', 'Administrator', 'Login', 'User logged in'),
(57, '2026-02-05 13:53:07', 'Administrator', 'Logout', 'User logged out'),
(58, '2026-02-05 13:53:12', 'Administrator', 'Login', 'User logged in');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` varchar(50) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `access` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `label`, `access`) VALUES
('admin', 'Administrator', '{\"dashboard\":[\"view\",\"create\",\"edit\",\"delete\"],\"inventory\":[\"view\",\"create\",\"edit\",\"delete\"],\"documents\":[\"view\",\"create\",\"edit\",\"delete\"],\"tax-monitoring\":[\"view\",\"create\",\"edit\",\"delete\"],\"tax-summary\":[\"view\",\"create\",\"edit\",\"delete\"],\"master\":[\"view\",\"create\",\"edit\",\"delete\"]}'),
('staff', 'Staff Gudang', '{\"dashboard\":[\"view\"],\"inventory\":[\"view\",\"create\",\"edit\"],\"documents\":[\"view\",\"create\"],\"tax-monitoring\":[\"view\"],\"tax-summary\":[\"view\"]}'),
('viewer', 'Tamu / Viewer', '{\"dashboard\":[\"view\"],\"inventory\":[\"view\"],\"documents\":[\"view\"],\"tax-monitoring\":[\"view\"],\"tax-summary\":[\"view\"]}');

-- --------------------------------------------------------

--
-- Table structure for table `tax_audits`
--

CREATE TABLE `tax_audits` (
  `id` varchar(255) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `currentStep` int(11) DEFAULT NULL,
  `steps` text DEFAULT NULL,
  `letterNumber` varchar(100) DEFAULT NULL,
  `startDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tax_audits`
--

INSERT INTO `tax_audits` (`id`, `title`, `status`, `currentStep`, `steps`, `letterNumber`, `startDate`) VALUES
('1770126697004', 'Tax ppn 2025', 'On Progress', 1, '[{\"notes\":[{\"id\":\"1770126761544\",\"text\":\"bank\",\"pic\":\"EKO\",\"isChecked\":false}],\"status\":\"On Progress\",\"startDate\":\"2026-02-03\",\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null}]', '111/223213', '2026-02-01 06:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `tax_summaries`
--

CREATE TABLE `tax_summaries` (
  `id` int(11) NOT NULL,
  `month` varchar(50) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `pph23` decimal(15,2) DEFAULT NULL,
  `pph42` decimal(15,2) DEFAULT NULL,
  `pph26` decimal(15,2) DEFAULT NULL,
  `ppnIn` text DEFAULT NULL,
  `ppnOut` text DEFAULT NULL,
  `extraPph` text DEFAULT NULL,
  `extraPpnIn` text DEFAULT NULL,
  `extraPpnOut` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tax_summaries`
--

INSERT INTO `tax_summaries` (`id`, `month`, `year`, `pph23`, `pph42`, `pph26`, `ppnIn`, `ppnOut`, `extraPph`, `extraPpnIn`, `extraPpnOut`) VALUES
(1, 'Januari', 2026, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Januari', 2026, 100000.00, 1000.00, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Januari', 2026, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'Januari', 2026, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `department`) VALUES
(1, 'admin', '123', 'Administrator', 'admin', 'IT'),
(2, 'staff', '123', 'Staff Gudang', 'staff', 'Warehouse'),
(3, 'tamu', '123', 'Tamu', 'viewer', 'General');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `external_items`
--
ALTER TABLE `external_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `folders`
--
ALTER TABLE `folders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `logs`
--
ALTER TABLE `logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tax_audits`
--
ALTER TABLE `tax_audits`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tax_summaries`
--
ALTER TABLE `tax_summaries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `external_items`
--
ALTER TABLE `external_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `folders`
--
ALTER TABLE `folders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT for table `tax_summaries`
--
ALTER TABLE `tax_summaries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

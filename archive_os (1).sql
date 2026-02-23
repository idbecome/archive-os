-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 06, 2026 at 09:30 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

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
  `name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
  `stepIndex` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `title`, `upload_date`, `version`, `ocr_content`, `size`, `type`, `uploader`, `locked`, `versions_history`, `uploadDate`, `ocrContent`, `folderId`, `fileData`, `url`, `department`, `owner`, `auditId`, `stepIndex`) VALUES
('1770126359033', 'detail (1) (6).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:45:59', NULL, '2', NULL, NULL, 'Tax', 'Administrator', '1770125447817', 1),
('1770126388399', 'detail (1) (3).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:46:28', NULL, '3', NULL, NULL, 'Tax', 'Administrator', '1770126382836', 1),
('1770126438073', 'detail (1) (3).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:47:18', 'Initial attachment', '4', NULL, NULL, 'Tax', 'Administrator', '1770126438046', 0),
('1770126460371', 'detail (1) (3) (1).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:47:40', NULL, '4', NULL, NULL, 'Tax', 'Administrator', '1770126438046', 1),
('1770126697032', 'detail (1) (7).pdf', NULL, NULL, NULL, '0.6 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-03 13:51:37', 'Initial attachment', '5', NULL, NULL, 'Tax', 'Administrator', '1770126697004', 0),
('1770360220970', 'Passport_YuheiHoshino_PRV.pdf', NULL, NULL, NULL, '1.33 MB', 'application/pdf', NULL, NULL, NULL, '2026-02-06 06:43:40', '', '5', NULL, NULL, NULL, NULL, NULL, NULL),
('1770363763435', 'Undangan Evacuation drill.pdf', NULL, NULL, NULL, '165.9 KB', 'application/pdf', NULL, NULL, NULL, '2026-02-06 07:42:43', NULL, '5', NULL, NULL, 'Tax', 'Administrator', '1770126697004', 1),
('1770366544226', 'Undangan Evacuation drill.pdf', NULL, NULL, NULL, '0.16 MB', 'application/pdf', NULL, NULL, NULL, '2026-02-06 08:29:04', '', '1', NULL, NULL, NULL, NULL, NULL, NULL);

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
  `history` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
  `createdAt` datetime DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
  `box_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'EMPTY',
  `box_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`box_data`)),
  `history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`history`)),
  `last_updated` datetime DEFAULT NULL,
  `lastUpdated` datetime DEFAULT NULL,
  `boxData` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `status`, `box_data`, `history`, `last_updated`, `lastUpdated`, `boxData`) VALUES
(1, 'EMPTY', NULL, '[{\"id\":1770119159691,\"timestamp\":\"2026-02-03T11:45:59.691Z\",\"action\":\"IMPORTED\",\"note\":\"Import: BOX-2024-001\",\"user\":\"Administrator\"},{\"id\":1770119401255,\"timestamp\":\"2026-02-03T11:50:01.255Z\",\"action\":\"REMOVED\",\"note\":\"Dikosongkan manual\",\"user\":\"Administrator\"},{\"id\":1770119429361,\"timestamp\":\"2026-02-03T11:50:29.361Z\",\"action\":\"IMPORTED\",\"note\":\"Import: BOX-2024-001\",\"user\":\"Administrator\"},{\"id\":1770207127561,\"timestamp\":\"2026-02-04T12:12:07.561Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770207129592,\"timestamp\":\"2026-02-04T12:12:09.592Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770345328196,\"timestamp\":\"2026-02-06T02:35:28.196Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770345330247,\"timestamp\":\"2026-02-06T02:35:30.247Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770345335662,\"timestamp\":\"2026-02-06T02:35:35.662Z\",\"action\":\"EXTERNAL\",\"note\":\"Dikirim ke Indoarsip (2026-02-06)\",\"user\":\"Administrator\"}]', NULL, '2026-02-06 02:35:35', 'null'),
(2, 'STORED', NULL, '[{\"id\":1770120966260,\"timestamp\":\"2026-02-03T12:16:06.260Z\",\"action\":\"MOVED\",\"note\":\"Pindahan dr Slot #2\",\"user\":\"Administrator\"},{\"id\":1770120978128,\"timestamp\":\"2026-02-03T12:16:18.128Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770120980872,\"timestamp\":\"2026-02-03T12:16:20.872Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770120982686,\"timestamp\":\"2026-02-03T12:16:22.686Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207898093,\"timestamp\":\"2026-02-04T12:24:58.093Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770207900041,\"timestamp\":\"2026-02-04T12:25:00.041Z\",\"action\":\"AUDIT\",\"note\":\"Status: Sedang Audit\",\"user\":\"Administrator\"},{\"id\":1770207902983,\"timestamp\":\"2026-02-04T12:25:02.983Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770289679439,\"timestamp\":\"2026-02-05T11:07:59.439Z\",\"action\":\"RESTORED\",\"note\":\"Dikembalikan dari Indoarsip\",\"user\":\"Administrator\"}]', NULL, '2026-02-05 11:07:59', '{\"id\":\"BOX-2024-002\",\"ordners\":[{\"id\":1770119429369,\"noOrdner\":\"ORD-002\",\"period\":\"Jan 2024\",\"invoices\":[{\"id\":1770119429369.8174,\"invoiceNo\":\"INV/002\",\"vendor\":\"Vendor B\",\"paymentDate\":\"2024-01-31\"}]}]}'),
(3, 'EMPTY', NULL, '[]', NULL, NULL, NULL),
(4, 'STORED', NULL, '[{\"id\":1770119159691,\"timestamp\":\"2026-02-03T11:45:59.691Z\",\"action\":\"IMPORTED\",\"note\":\"Import: BOX-2024-001\",\"user\":\"Administrator\"},{\"id\":1770119401255,\"timestamp\":\"2026-02-03T11:50:01.255Z\",\"action\":\"REMOVED\",\"note\":\"Dikosongkan manual\",\"user\":\"Administrator\"},{\"id\":1770119429361,\"timestamp\":\"2026-02-03T11:50:29.361Z\",\"action\":\"IMPORTED\",\"note\":\"Import: BOX-2024-001\",\"user\":\"Administrator\"},{\"id\":1770207127561,\"timestamp\":\"2026-02-04T12:12:07.561Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770207129592,\"timestamp\":\"2026-02-04T12:12:09.592Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770345328196,\"timestamp\":\"2026-02-06T02:35:28.196Z\",\"action\":\"BORROWED\",\"note\":\"Status: Dipinjam User\",\"user\":\"Administrator\"},{\"id\":1770345330247,\"timestamp\":\"2026-02-06T02:35:30.247Z\",\"action\":\"STORED\",\"note\":\"Status: Dikembalikan User\",\"user\":\"Administrator\"},{\"id\":1770345342711,\"timestamp\":\"2026-02-06T02:35:42.711Z\",\"action\":\"RESTORED\",\"note\":\"Dikembalikan dari Indoarsip\",\"user\":\"Administrator\"}]', NULL, '2026-02-06 02:35:42', '{\"id\":\"BOX-2024-001\",\"ordners\":[{\"id\":1770119429361,\"noOrdner\":\"ORD-001\",\"period\":\"Jan 2024\",\"invoices\":[{\"id\":1770119429361.5493,\"invoiceNo\":\"INV/001\",\"vendor\":\"Vendor A\",\"paymentDate\":\"2024-01-31\"}]}]}'),
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
  `details` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
(58, '2026-02-05 13:53:12', 'Administrator', 'Login', 'User logged in'),
(59, '2026-02-06 02:34:41', 'Admin', 'Login', 'Admin logged in'),
(60, '2026-02-06 02:35:28', 'Administrator', 'Ubah Status', 'Slot #1 status: Dipinjam User'),
(61, '2026-02-06 02:35:30', 'Administrator', 'Ubah Status', 'Slot #1 status: Dikembalikan User'),
(62, '2026-02-06 02:35:35', 'Administrator', 'Barang Keluar', 'Kardus ke Indoarsip'),
(63, '2026-02-06 02:35:42', 'Administrator', 'Barang Masuk (Restore)', 'Restore BOX-2024-001 dari Indoarsip'),
(64, '2026-02-06 02:36:29', 'Administrator', 'Logout', 'User logged out'),
(65, '2026-02-06 02:36:36', 'Tamu', 'Login', 'User logged in'),
(66, '2026-02-06 02:36:49', 'Tamu', 'Logout', 'User logged out'),
(67, '2026-02-06 02:36:53', 'Admin', 'Login', 'Admin logged in'),
(68, '2026-02-06 02:39:01', 'Administrator', 'Create Pajak', 'PPN - Januari 2026'),
(69, '2026-02-06 02:39:25', 'Administrator', 'Create Pajak', 'PPN - Februari 2026'),
(70, '2026-02-06 02:39:45', 'Administrator', 'Create Pajak', 'PPH - Januari 2026'),
(71, '2026-02-06 02:53:46', 'Administrator', 'Update User', 'eko'),
(72, '2026-02-06 03:00:52', 'Administrator', 'Logout', 'User logged out'),
(73, '2026-02-06 03:02:55', 'Admin', 'Login', 'Admin logged in'),
(74, '2026-02-06 03:17:18', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(75, '2026-02-06 03:17:20', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(76, '2026-02-06 03:18:23', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(77, '2026-02-06 03:18:24', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(78, '2026-02-06 03:21:16', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(79, '2026-02-06 03:21:17', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(80, '2026-02-06 03:22:58', 'Administrator', 'Import Pajak', 'Import 0 baru, 1 update'),
(81, '2026-02-06 03:23:00', 'Administrator', 'Import Pajak', 'Import 0 baru, 1 update'),
(82, '2026-02-06 03:26:42', 'Administrator', 'Import Pajak', 'Import 0 baru, 1 update'),
(83, '2026-02-06 03:26:43', 'Administrator', 'Import Pajak', 'Import 0 baru, 1 update'),
(84, '2026-02-06 03:29:31', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(85, '2026-02-06 03:29:33', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(86, '2026-02-06 03:36:25', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(87, '2026-02-06 03:36:26', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(88, '2026-02-06 03:40:07', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(89, '2026-02-06 03:40:08', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(90, '2026-02-06 03:47:26', 'Administrator', 'Update User', 'eko'),
(91, '2026-02-06 03:47:27', 'Administrator', 'Logout', 'User logged out'),
(92, '2026-02-06 03:47:30', 'eko', 'Login', 'User logged in'),
(93, '2026-02-06 03:48:30', 'eko', 'Logout', 'User logged out'),
(94, '2026-02-06 03:48:31', 'Admin', 'Login', 'Admin logged in'),
(95, '2026-02-06 04:04:52', 'Administrator', 'Logout', 'User logged out'),
(96, '2026-02-06 04:04:55', 'eko', 'Login', 'User logged in'),
(97, '2026-02-06 04:04:58', 'eko', 'Logout', 'User logged out'),
(98, '2026-02-06 04:04:59', 'Admin', 'Login', 'Admin logged in'),
(99, '2026-02-06 04:16:17', 'Administrator', 'Logout', 'User logged out'),
(100, '2026-02-06 04:16:20', 'eko', 'Login', 'User logged in'),
(101, '2026-02-06 04:18:50', 'eko', 'Logout', 'User logged out'),
(102, '2026-02-06 04:18:52', 'Admin', 'Login', 'Admin logged in'),
(103, '2026-02-06 04:18:56', 'Administrator', 'Logout', 'User logged out'),
(104, '2026-02-06 04:19:00', 'eko', 'Login', 'User logged in'),
(105, '2026-02-06 04:25:36', 'eko', 'Logout', 'User logged out'),
(106, '2026-02-06 04:25:37', 'Admin', 'Login', 'Admin logged in'),
(107, '2026-02-06 04:25:48', 'Administrator', 'Logout', 'User logged out'),
(108, '2026-02-06 04:25:51', 'eko', 'Login', 'User logged in'),
(109, '2026-02-06 04:28:13', 'eko', 'Logout', 'User logged out'),
(110, '2026-02-06 04:28:15', 'Admin', 'Login', 'Admin logged in'),
(111, '2026-02-06 04:28:35', 'Administrator', 'Logout', 'User logged out'),
(112, '2026-02-06 04:28:38', 'eko', 'Login', 'User logged in'),
(113, '2026-02-06 06:02:16', 'eko', 'Logout', 'User logged out'),
(114, '2026-02-06 06:02:18', 'Admin', 'Login', 'Admin logged in'),
(115, '2026-02-06 06:03:56', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0012 Umeda.pdf\"'),
(116, '2026-02-06 06:03:56', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0012 Umeda.pdf'),
(117, '2026-02-06 06:04:21', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(118, '2026-02-06 06:04:32', 'Administrator', 'Hapus Dokumen', 'ID 1770357836733'),
(119, '2026-02-06 06:07:57', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0013 Morinaga.pdf\"'),
(120, '2026-02-06 06:07:57', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0013 Morinaga.pdf'),
(121, '2026-02-06 06:08:05', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0013 Morinaga.pdf'),
(122, '2026-02-06 06:10:23', 'Administrator', 'Hapus Dokumen', 'ID 1770358077281'),
(123, '2026-02-06 06:11:37', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0012 Umeda.pdf\"'),
(124, '2026-02-06 06:11:37', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0012 Umeda.pdf'),
(125, '2026-02-06 06:12:28', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(126, '2026-02-06 06:13:31', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(127, '2026-02-06 06:15:22', 'Administrator', 'Hapus Dokumen', 'ID 1770358297084'),
(128, '2026-02-06 06:16:25', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0013 Morinaga.pdf\"'),
(129, '2026-02-06 06:16:25', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0013 Morinaga.pdf'),
(130, '2026-02-06 06:16:32', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0013 Morinaga.pdf'),
(131, '2026-02-06 06:19:27', 'Administrator', 'Hapus Dokumen', 'ID 1770127418655_774'),
(132, '2026-02-06 06:20:05', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0012 Umeda.pdf\"'),
(133, '2026-02-06 06:20:05', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0012 Umeda.pdf'),
(134, '2026-02-06 06:22:11', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(135, '2026-02-06 06:22:17', 'Administrator', 'Hapus Dokumen', 'ID 1770358585362'),
(136, '2026-02-06 06:23:02', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0013 Morinaga.pdf\"'),
(137, '2026-02-06 06:23:02', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0013 Morinaga.pdf'),
(138, '2026-02-06 06:23:09', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0013 Morinaga.pdf'),
(139, '2026-02-06 06:27:51', 'Administrator', 'Hapus Dokumen', 'ID 1770358982164'),
(140, '2026-02-06 06:28:31', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0012 Umeda.pdf\"'),
(141, '2026-02-06 06:28:31', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0012 Umeda.pdf'),
(142, '2026-02-06 06:28:35', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(143, '2026-02-06 06:29:24', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(144, '2026-02-06 06:38:35', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(145, '2026-02-06 06:38:42', 'Administrator', 'Hapus Dokumen', 'ID 1770359311185'),
(146, '2026-02-06 06:38:50', 'System', 'Upload', 'Mengunggah dokumen: \"Scan Surat 0012 Umeda.pdf\"'),
(147, '2026-02-06 06:38:50', 'Administrator', 'Upload Dokumen', 'Dokumen baru Scan Surat 0012 Umeda.pdf'),
(148, '2026-02-06 06:38:52', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(149, '2026-02-06 06:39:13', 'Administrator', 'Download', 'Mengunduh file: Scan Surat 0012 Umeda.pdf'),
(150, '2026-02-06 06:39:42', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(151, '2026-02-06 06:39:44', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(152, '2026-02-06 06:43:28', 'Administrator', 'Hapus Dokumen', 'ID 1770358805558'),
(153, '2026-02-06 06:43:41', 'System', 'Upload', 'Mengunggah dokumen: \"Passport_YuheiHoshino_PRV.pdf\"'),
(154, '2026-02-06 06:43:41', 'Administrator', 'Upload Dokumen', 'Dokumen baru Passport_YuheiHoshino_PRV.pdf'),
(155, '2026-02-06 06:44:07', 'Administrator', 'Download', 'Mengunduh file: Passport_YuheiHoshino_PRV.pdf'),
(156, '2026-02-06 06:47:04', 'Administrator', 'Hapus Dokumen', 'ID 1770359930061'),
(157, '2026-02-06 06:47:12', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(158, '2026-02-06 06:47:12', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(159, '2026-02-06 06:47:17', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(160, '2026-02-06 06:52:14', 'Administrator', 'Hapus Dokumen', 'ID 1770360432051'),
(161, '2026-02-06 06:52:23', 'Administrator', 'Download', 'Mengunduh file: detail (1).pdf'),
(162, '2026-02-06 06:54:04', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(163, '2026-02-06 06:54:04', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(164, '2026-02-06 06:54:40', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(165, '2026-02-06 06:56:16', 'Administrator', 'Hapus Dokumen', 'ID 1770360844717'),
(166, '2026-02-06 06:56:21', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(167, '2026-02-06 06:56:21', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(168, '2026-02-06 06:56:24', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(169, '2026-02-06 07:01:07', 'Administrator', 'Hapus Dokumen', 'ID 1770360981633'),
(170, '2026-02-06 07:01:09', 'Administrator', 'Download', 'Mengunduh file: detail (1).pdf'),
(171, '2026-02-06 07:01:17', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(172, '2026-02-06 07:01:17', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(173, '2026-02-06 07:01:21', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(174, '2026-02-06 07:04:26', 'Administrator', 'Hapus Dokumen', 'ID 1770361277041'),
(175, '2026-02-06 07:04:33', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(176, '2026-02-06 07:04:33', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(177, '2026-02-06 07:04:38', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(178, '2026-02-06 07:07:42', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(179, '2026-02-06 07:07:47', 'Administrator', 'Hapus Dokumen', 'ID 1770361473042'),
(180, '2026-02-06 07:07:55', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(181, '2026-02-06 07:07:55', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(182, '2026-02-06 07:08:01', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(183, '2026-02-06 07:10:56', 'Administrator', 'Hapus Dokumen', 'ID 1770361675885'),
(184, '2026-02-06 07:10:59', 'Administrator', 'Download', 'Mengunduh file: detail (1).pdf'),
(185, '2026-02-06 07:11:04', 'Administrator', 'Hapus Dokumen', 'ID 1770120145515'),
(186, '2026-02-06 07:11:10', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(187, '2026-02-06 07:11:10', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(188, '2026-02-06 07:11:19', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(189, '2026-02-06 07:25:35', 'Administrator', 'Hapus Dokumen', 'ID 1770361870277'),
(190, '2026-02-06 07:25:41', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(191, '2026-02-06 07:25:41', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(192, '2026-02-06 07:30:24', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(193, '2026-02-06 07:30:30', 'Administrator', 'Hapus Dokumen', 'ID 1770362741723'),
(194, '2026-02-06 07:30:36', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(195, '2026-02-06 07:30:36', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(196, '2026-02-06 07:31:21', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(197, '2026-02-06 07:33:15', 'Administrator', 'Hapus Dokumen', 'ID 1770363036591'),
(198, '2026-02-06 07:33:24', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(199, '2026-02-06 07:33:24', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(200, '2026-02-06 07:33:27', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(201, '2026-02-06 07:36:45', 'Administrator', 'Hapus Dokumen', 'ID 1770363204231'),
(202, '2026-02-06 07:36:51', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(203, '2026-02-06 07:36:51', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(204, '2026-02-06 07:36:56', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(205, '2026-02-06 07:42:02', 'Administrator', 'Hapus Dokumen', 'ID 1770363411150'),
(206, '2026-02-06 07:42:08', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(207, '2026-02-06 07:42:08', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(208, '2026-02-06 07:42:13', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(209, '2026-02-06 07:42:43', 'Administrator', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(210, '2026-02-06 07:43:00', 'Administrator', 'Hapus Dokumen', 'ID 1770363728048'),
(211, '2026-02-06 07:43:07', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(212, '2026-02-06 07:44:54', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(213, '2026-02-06 07:44:55', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(214, '2026-02-06 07:47:49', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(215, '2026-02-06 07:48:19', 'Administrator', 'Hapus Dokumen', 'ID 1770363894963'),
(216, '2026-02-06 07:48:26', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(217, '2026-02-06 07:48:26', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(218, '2026-02-06 07:49:22', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(219, '2026-02-06 07:49:38', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(220, '2026-02-06 07:49:39', 'Administrator', 'Import Pajak', 'Import 1 baru, 0 update'),
(221, '2026-02-06 07:53:04', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(222, '2026-02-06 07:55:18', 'Administrator', 'Hapus Dokumen', 'ID 1770364106289'),
(223, '2026-02-06 07:55:24', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(224, '2026-02-06 07:55:24', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(225, '2026-02-06 07:55:29', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(226, '2026-02-06 08:02:13', 'Administrator', 'Hapus Dokumen', 'ID 1770364524476'),
(227, '2026-02-06 08:02:20', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(228, '2026-02-06 08:02:20', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(229, '2026-02-06 08:02:55', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(230, '2026-02-06 08:17:18', 'Administrator', 'Hapus Dokumen', 'ID 1770364940634'),
(231, '2026-02-06 08:17:25', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(232, '2026-02-06 08:17:25', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(233, '2026-02-06 08:20:30', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(234, '2026-02-06 08:20:38', 'Administrator', 'Hapus Dokumen', 'ID 1770365845511'),
(235, '2026-02-06 08:20:45', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(236, '2026-02-06 08:20:45', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(237, '2026-02-06 08:23:58', 'Administrator', 'Hapus Dokumen', 'ID 1770366045591'),
(238, '2026-02-06 08:24:05', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(239, '2026-02-06 08:24:05', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(240, '2026-02-06 08:24:51', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(241, '2026-02-06 08:26:41', 'Administrator', 'Hapus Dokumen', 'ID 1770366245250'),
(242, '2026-02-06 08:26:47', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(243, '2026-02-06 08:26:47', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(244, '2026-02-06 08:26:54', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf'),
(245, '2026-02-06 08:28:46', 'Administrator', 'Download', 'Mengunduh file: Copy of detail (1).pdf'),
(246, '2026-02-06 08:28:51', 'Administrator', 'Hapus Dokumen', 'ID 1770293023770_450'),
(247, '2026-02-06 08:28:55', 'Administrator', 'Hapus Dokumen', 'ID 1770366407519'),
(248, '2026-02-06 08:29:04', 'System', 'Upload', 'Mengunggah dokumen: \"Undangan Evacuation drill.pdf\"'),
(249, '2026-02-06 08:29:04', 'Administrator', 'Upload Dokumen', 'Dokumen baru Undangan Evacuation drill.pdf'),
(250, '2026-02-06 08:29:47', 'Administrator', 'Download', 'Mengunduh file: Undangan Evacuation drill.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` varchar(50) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `access` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `label`, `access`) VALUES
('admin', 'Administrator', '{"dashboard":["view","create","edit","delete"],"inventory":["view","create","edit","delete"],"documents":["view","create","edit","delete"],"tax-monitoring":["view","create","edit","delete"],"tax-summary":["view","create","edit","delete"],"master":["view","create","edit","delete"],"approvals":["view","create","edit","delete"]}'),
('staff', 'Staff Gudang', '{"dashboard":["view","create","edit","delete"],"inventory":["view","create","edit","delete"],"documents":["view","create","edit","delete"],"tax-monitoring":["view","create","edit","delete"],"tax-summary":["view","create","edit","delete"],"approvals":["view","create","edit","delete"]}'),
('viewer', 'Tamu / Viewer', '{"dashboard":["view"],"inventory":["view"],"documents":["view"],"tax-monitoring":["view"],"tax-summary":["view"],"approvals":["view"]}');

-- --------------------------------------------------------

--
-- Table structure for table `document_approvals`
--

CREATE TABLE IF NOT EXISTS `document_approvals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `division` text DEFAULT NULL,
  `requester_name` text DEFAULT NULL,
  `requester_username` text DEFAULT NULL,
  `attachment_url` text DEFAULT NULL,
  `attachment_name` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `current_step_index` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `approval_steps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `approval_id` int(11) DEFAULT NULL,
  `step_index` int(11) DEFAULT NULL,
  `approver_username` text DEFAULT NULL,
  `approver_name` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `action_date` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`approval_id`) REFERENCES `document_approvals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  `startDate` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tax_audits`
--

INSERT INTO `tax_audits` (`id`, `title`, `status`, `currentStep`, `steps`, `letterNumber`, `startDate`) VALUES
('1770126697004', 'Tax ppn 2025', 'On Progress', 1, '[{\"notes\":[{\"id\":\"1770126761544\",\"text\":\"bank\",\"pic\":\"EKO\",\"isChecked\":false}],\"status\":\"On Progress\",\"startDate\":\"2026-02-03\",\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null},{\"notes\":[],\"status\":\"Pending\",\"startDate\":null,\"endDate\":null}]', '111/223213', '2026-01-31 16:00:00');

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
  `extraPpnOut` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tax_summaries`
--

INSERT INTO `tax_summaries` (`id`, `month`, `year`, `pph23`, `pph42`, `pph26`, `ppnIn`, `ppnOut`, `extraPph`, `extraPpnIn`, `extraPpnOut`) VALUES
(1, 'Januari', 2026, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Januari', 2026, 100000.00, 1000.00, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Januari', 2026, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'Januari', 2026, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Februari', 2026, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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
  `department` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `department`) VALUES
(1, 'admin', '123', 'Administrator', 'admin', 'IT'),
(2, 'eko', '123', 'eko', 'Staff Gudang', 'Warehouse'),
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
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `box_id` (`box_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `folders`
--
ALTER TABLE `folders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=251;

--
-- AUTO_INCREMENT for table `tax_summaries`
--
ALTER TABLE `tax_summaries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

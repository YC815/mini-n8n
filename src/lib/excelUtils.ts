import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * 解析用戶上傳的 ArrayBuffer（Excel 檔案）為二維陣列
 */
export function parseExcel(arrayBuffer: ArrayBuffer): any[][] {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  return data;
}

/**
 * 依據二維陣列 data 產生可供下載的 Excel Blob，並利用 file-saver 觸發下載
 */
export function exportExcel(data: any[][], fileName: string) {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const wbout = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });
  const blob = new Blob([wbout], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });
  saveAs(blob, `${fileName}.xlsx`);
} 
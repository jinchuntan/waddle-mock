import * as XLSX from 'xlsx'

export function exportRecommendationsToExcel(items) {
  const rows = items.map((item) => ({
    'Company':  item.company  ?? '',
    'Price':    item.price    ?? '',
    'Phone':    item.phone    ?? '',
    'Email':    item.email    ?? '',
    'Website':  item.website  ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Column widths
  worksheet['!cols'] = [
    { wch: 30 }, // Company
    { wch: 18 }, // Price
    { wch: 20 }, // Phone
    { wch: 32 }, // Email
    { wch: 36 }, // Website
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recommendations')

  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `waddle-recommendations-${timestamp}.xlsx`)
}

import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import db from '@/lib/db'

/**
 * Encodes a guest ID to base64url format (server-side version)
 */
function encodeGuestId(id: number): string {
  const secret = 'wedding2026'
  const padding = String(id).padStart(6, '0').split('').reverse().join('')
  const combined = `${id}-${secret}-${padding}`
  const base64 = Buffer.from(combined).toString('base64')
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Groups guests by family (same logic as admin page)
 */
function groupGuestsByFamily(guests: any[]): Map<number, any[]> {
  const grouped = new Map<number, any[]>()
  
  for (const guest of guests) {
    if (guest.family_id) {
      // This guest is linked to another guest
      const familyId = guest.family_id
      if (!grouped.has(familyId)) {
        grouped.set(familyId, [])
        // Find and add the main guest
        const mainGuest = guests.find(g => g.id === familyId)
        if (mainGuest && !grouped.get(familyId)!.some(g => g.id === mainGuest.id)) {
          grouped.get(familyId)!.push(mainGuest)
        }
      }
      // Add this guest if not already in the group
      if (!grouped.get(familyId)!.some(g => g.id === guest.id)) {
        grouped.get(familyId)!.push(guest)
      }
    } else {
      // Check if this guest is the main guest of any group
      const isMainGuest = guests.some(g => g.family_id === guest.id)
      if (isMainGuest) {
        const key = guest.id
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        if (!grouped.get(key)!.some(g => g.id === guest.id)) {
          grouped.get(key)!.push(guest)
        }
      } else {
        // Single guest - treat as a group with one member
        grouped.set(guest.id, [guest])
      }
    }
  }
  
  return grouped
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const adminKey = searchParams.get('adminKey')
    
    // Admin check
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Get all guests
    const guests = await db.prepare('SELECT * FROM guests ORDER BY surname, name, created_at DESC').all() as any[]
    
    if (!guests || guests.length === 0) {
      return NextResponse.json({ error: 'Nessun ospite trovato' }, { status: 404 })
    }

    // Group guests by family
    const groupedGuests = groupGuestsByFamily(guests)
    
    // Get base URL for generating participation URLs
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (host?.includes('localhost') ? 'http' : 'https')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (host ? `${protocol}://${host}` : 'http://localhost:3000')
    
    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    
    const page = await browser.newPage()
    
    // Set viewport to A4 landscape dimensions at 150 DPI for consistent proportions
    // A4 landscape: 297mm x 210mm = 11.69" x 8.27"
    // At 150 DPI: 1754px x 1239px
    // Using exact A4 landscape proportions ensures consistent rendering
    await page.setViewport({
      width: 1754,
      height: 1239,
      deviceScaleFactor: 1,
    })
    
    // Set user agent to ensure consistent rendering
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Create a PDF document to combine all pages
    const mergedPdf = await PDFDocument.create()
    
    // Generate PDF for each family group
    const familyIds = Array.from(groupedGuests.keys()).sort((a, b) => {
      const groupA = groupedGuests.get(a)!
      const groupB = groupedGuests.get(b)!
      const surnameA = groupA[0].surname || ''
      const surnameB = groupB[0].surname || ''
      if (surnameA !== surnameB) {
        return surnameA.localeCompare(surnameB)
      }
      return groupA[0].name.localeCompare(groupB[0].name)
    })
    
    for (const familyId of familyIds) {
      const familyMembers = groupedGuests.get(familyId)!
      const mainGuest = familyMembers[0]
      
      // Encode guest ID
      const encodedId = encodeGuestId(mainGuest.id)
      
      // Navigate to participation page
      const participationUrl = `${baseUrl}/admin/participation/${encodedId}`
      
      try {
        // Add pdf-export parameter to URL to trigger fixed-size CSS
        const pdfUrl = `${participationUrl}?pdf-export=true`
        
        await page.goto(pdfUrl, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        })
        
        // Wait for content to load and fonts to be ready
        await page.waitForSelector('h1', { timeout: 10000 })
        
        // Wait for fonts to load (Google Fonts)
        await page.evaluateHandle(() => document.fonts.ready)
        
        // Wait a bit more for any animations or transitions
        await page.waitForTimeout(500)
        
        // Generate PDF for this page with exact A4 landscape dimensions
        const pdfBuffer = await page.pdf({
          format: 'A4',
          landscape: true,
          printBackground: true,
          preferCSSPageSize: false, // Use format dimensions instead of CSS @page
          margin: {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
          },
        })
        
        // Load PDF and add pages to merged document
        const pdfDoc = await PDFDocument.load(pdfBuffer)
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
        pages.forEach((page) => mergedPdf.addPage(page))
      } catch (error) {
        console.error(`Error generating PDF for guest ${mainGuest.id}:`, error)
        // Continue with next guest even if one fails
      }
    }
    
    await browser.close()
    
    // Generate final PDF
    const pdfBytes = await mergedPdf.save()
    
    // Return PDF as response
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="partecipazioni-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error exporting participations:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'esportazione delle partecipazioni' },
      { status: 500 }
    )
  }
}

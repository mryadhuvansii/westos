# WESTOS chalane ki guide

Yeh guide naye admin aur single-store inventory update ke liye hai. **Update local mein hai; online publish abhi repository access approval ke baad hoga.** Purani live website par filhaal yeh admin panel nahi hai.

## 1. Admin login

Publish hone ke baad website ke address ke end mein `/admin/` kholein:
`https://westos-denim-studio.westosjeans.chatgpt.site/admin/`

Apne owner ChatGPT account `westosjeans@gmail.com` se sign in karein. Alag username/password banaya nahi gaya hai. Customer ka `/account/` page admin login nahi hai.

Pehli baar **Set up store management** dabayein. Isse aapka owner access aur shared records banenge. 8 sample products ka stock zero se shuru hoga; asli stock count karke bharein. Setup dobara dabane se existing products/settings reset nahi hote.

## 2. Products update karna

**Admin → Products → Edit** se existing product badlein. **Add product** se naya product banayein.

Name, category, fit, price, MRP aur description bharein. Ek hi product ke andar multiple colours add kar sakte hain. Har colour ka naam, colour code, photos aur waist sizes alag hain. Example: ek jeans mein Indigo aur Black; dono mein `28, 30, 32, 34, 36`.

Har colour ke liye JPG/PNG/WebP photos upload karein, 5 MB per photo tak. Ek colour mein 6 photos tak rakh sakte hain; pehli photo main photo hogi. Photo upload ke baad **Save product** zaroor karein. Ek product mein 12 colours aur total 100 colour-size variants tak hain.

Har colour-size ka alag **SKU** hai, jaise `DAYBREAK-BLACK-32`. Naya SKU save karne se pehle edit kar sakte hain. Save hone ke baad SKU aur colour ID fixed hain; purani stock history doosre item ko assign nahi hoti. Naye variants zero stock se shuru hote hain. Price/MRP abhi poore product ke liye same hain.

Visibility ka matlab:

| Option | Website par kya hoga |
| --- | --- |
| Draft | Product hidden rahega |
| Published | Shop/rail mein dikhega; stock hone par bag mein add hoga |
| Archived | Shopping se hat jayega; record/history bachegi |

Product address, jaise `daybreak-straight`, pehli baar save hone ke baad fixed hai. Price aur photo badalne ke liye coding/rebuild ki zaroorat nahi. Homepage rail illustrative jeans dikhata hai; aapki uploaded photo product aur shop pages par dikhegi.

## 3. Inventory maintain karna

**Admin → Inventory** mein product, colour, size ya SKU se search karein. Yeh ek store/warehouse ka stock hai.

| Column | Matlab |
| --- | --- |
| On hand | Store mein physical pieces |
| Reserved | Order/reference ke liye temporary hold kiye pieces |
| Available | On hand minus active reserved; website isi ko use karti hai |

Nayi delivery par relevant SKU ke saamne **Count stock** dabayein. Naya total count aur reason bharein → **Save stock count**. Example: Black size 32 ke 10 pieces hain, 5 naye aaye → **15** save karein, 5 nahi. Reason: `5 pieces received`. Active reserved stock se kam total save nahi hoga; cancellation ho toh pehle hold release karein.

**Reserve stock** se order/sale reference, colour-size quantities aur 1–60 minute ka hold banayein. Ek hold mein multiple sizes/colours le sakte hain. Kisi ek SKU mein stock kam hua toh poora hold reject hoga, aadha hold nahi banega.

- Customer cancel kare: reservation ka **Release** → reason → **Release stock**. Available quantity wapas aayegi; physical count nahi badlega.
- Pieces sell ho gaye: **Record stock sale** → confirm. Physical stock ghatega aur hold band hoga. Yeh payment collect/verify nahi karta.
- Time khatam: hold expire ho jayega aur availability apne aap release hogi. Expired hold ko sale nahi bana sakte; stock available ho toh naya reference/hold banayein.
- Sold pieces wapas physically mil gaye: relevant sold line par **Return stock** → quantity, reason aur inspection checkbox → save. Sirf sellable, inspected pieces add karein. Sold quantity se zyada ya ek hi retry par dobara return add nahi hoga. Refund alag payment process hai.

Example: On hand **10**, 2 reserve → Available **8**. Sale record → On hand **8**, Reserved **0**, Available **8**. Ek inspected piece return → On hand/Available **9**.

Zero available par wahi colour-size bag mein add nahi hoga; doosre colours ka stock unaffected rahega. Available 1–5 ko low-stock label milta hai. **Activity** mein owner, time, reason aur before/after record dikhega.

Purane store par **Upgrade inventory** dikhe toh ek baar dabayein: existing size stock original colour ke andar preserve hoga. Existing stocked/held variants remove nahi hote. Historical variants ka record bana rehta hai; poora product temporarily hatana ho toh Draft/Archived use karein.

Customer checkout abhi live nahi hai. Admin se stock operations ka flow kaam karta hai; customer order aur verified payment ke saath automatic connection next phase mein hoga. Bag mein add karne se stock hold nahi hota.

## 4. UPI ID kahan badlegi

**Admin → Settings → Receiving UPI → UPI ID → Save settings**.

Default ID **vijay@upi** hai. Nayi ID yahin edit karke save kar sakte hain. PIN/OTP/bank password nahi bharna hai.

Yeh abhi receiving ID ka store record hai. **Isse payment gateway activate nahi hota, aur hosted YouPI ka account apne aap change nahi hota.** YouPI abhi host nahi hai. Gateway tayyar hone par uske merchant receiving account mein bhi matching ID configure/verify karni hogi. Paise actual gateway ke active receiving account par jayenge.

UPI format validate hota hai; account kis bank/naam ka hai yeh is panel se verify nahi hota.

## 5. Payment kaise kaam karega

1. Future order service price, tax, shipping aur available stock check karke final order banayega aur inventory hold karega.
2. Approved order se YouPI checkout khulega.
3. Customer UPI se payment karega.
4. Gateway bank reconciliation karega aur signed confirmation bhejega.
5. WESTOS verified confirmation ke baad payment ko paid mark karega.

Sirf screenshot, QR scan, ya success-page redirect payment proof nahi hai. Reviewed YouPI version mein reconciliation ke liye bank statement import/manual operations hain; automatic bank confirmation pehle se connected nahi hai.

Abhi gateway hosting, merchant credentials, order backend aur end-to-end payment verification baaki hain. Checkout se real payment/order nahi liya ja raha. Inventory ka stock-sale status payment proof nahi hai. Detailed setup: `PAYMENT_SETUP.md`.

## 6. Buyback on/off

**Admin → Settings → Buyback → Show buyback page & eligibility checker → Save settings**.

- **Off:** website ki buyback promotions/checklist hide; direct page par unavailable message.
- **On:** program information aur preliminary eligibility checklist visible.

Yeh switch actual claim, credit ya discount approval activate nahi karta. Uske liye original order, account, serial code aur physical handover verification wala system banana baaki hai. Default Off hai.

## 7. Doosre phone/computer par

Published update mein products, stock, UPI aur buyback settings shared server database mein save hongi. Storefront reload karte hi latest values milengi; open tab focus par aur visible rehne par 30-second refresh bhi karta hai.

Admin mein **Reload saved values** latest record laata hai. **Discard edits & reload** unsaved edits hata dega. Agar another-tab conflict aaye, pehle latest values reload karein, phir change dobara karein. Isse ek staff/tab dusre ka stock overwrite nahi karta.

Bag aur wishlist abhi browser mein store hain; customer account/order history se sync nahi hote. Website abhi owner-private preview hai; customer public access alag launch step hai.

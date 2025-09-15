## วิธีการรันโปรเจ็ค
**0. สิ่งที่จำเป็น**
- ส่ง Username Github ลง Discord เพื่อเพิ่มเข้าทีม
- Node.js
- Github Desktop

**1. โคลนโปรเจ็คด้วย Github Desktop**<br>
หลังจากโหลดและ login แล้วให้กดหัวข้อ File -> Clone Reposity -> URL ->
```console
https://github.com/AchiZ48/karaoke.git
```
แล้วเลือก Branch ปกติจะเขียนว่า master ให้เลือก fron-end หรือ back-end<br>
- เวลาใช้งานเมื่อเซฟไฟล์จะขึ้นใน Git ว่าเราอัพเดทอะไรหรือแก้บรรทักไหนไปบ้าง<br>
- เลือกไฟล์ที่จะ commit(บันทึกใน local แต่ยังไม่อัพโหลด) และกด push คือการอัพเดทไฟล์จริงๆ (อย่าลืมเลือก branch)<br>
<br>
**2. ลง dependencies ด้วย**<br>
ไปที่โฟลเดอร์แล้วพิมพ์<br>
```console
npm install
```
**3. โหลดไฟล์ .env**<br>
สร้างไฟล์ชื่อ .env (ไม่มีชื่อตามด้วยสกุล .env) ในโฟลเดอร์หลัก (We-Will-Cook)<br>
<br>
**4. รันคำสั่งตามนี้**<br>
ในหน้า Command Prompt<br>
```console
nom run dev
```
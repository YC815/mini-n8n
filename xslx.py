import xlsxwriter
import random
import string
import time


def random_string(length):
    return ''.join(random.choices(string.ascii_letters, k=length))


def random_email():
    name = random_string(10)
    domain = random.choice(["example.com", "mail.com", "test.org", "bigdata.net"])
    return f"{name}@{domain}"


def generate_balance_excel(filename, num_rows):
    start = time.time()
    workbook = xlsxwriter.Workbook(filename)
    sheet = workbook.add_worksheet("Balance")
    sheet.write(0, 0, "ID")
    sheet.write(0, 1, "餘額")

    for row in range(1, num_rows + 1):
        sheet.write(row, 0, row)
        sheet.write(row, 1, round(random.uniform(0, 1_000_000), 2))
        if row % 100_000 == 0:
            print(f"[Balance] 已寫入 {row:,} 筆")

    workbook.close()
    print(f"✅ Balance 完成 ({(time.time() - start):.2f}s)")


def generate_userinfo_excel(filename, num_rows):
    start = time.time()
    workbook = xlsxwriter.Workbook(filename)
    sheet = workbook.add_worksheet("UserInfo")
    sheet.write(0, 0, "ID")
    sheet.write(0, 1, "姓名")
    sheet.write(0, 2, "Email")

    for row in range(1, num_rows + 1):
        sheet.write(row, 0, row)
        sheet.write(row, 1, random_string(20))
        sheet.write(row, 2, random_email())
        if row % 100_000 == 0:
            print(f"[UserInfo] 已寫入 {row:,} 筆")

    workbook.close()
    print(f"✅ UserInfo 完成 ({(time.time() - start):.2f}s)")


if __name__ == "__main__":
    # 每個檔案100萬筆，會接近1GB總容量
    generate_balance_excel("balance_data.xlsx", num_rows=1_000_000)
    generate_userinfo_excel("userinfo_data.xlsx", num_rows=1_000_000)

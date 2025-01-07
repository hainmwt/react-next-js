"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // store monetary values in cents to remove Js floating point errors ( lỗi sau dấu phẩy được thêm tự động với số tiền kiểu dữ liệu lẻ. VD: 0.1 + 0.2 = 0.3000000000004 mà không phải là 0.3. lấy 0.3 )
  const amountInCents = amount * 100;
  // date the format "YYYY-MM-DD"
  const date = new Date().toISOString().split("T")[0];

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  // insert thành công (database được cập nhật) thì validate lại đường dẫn, sau đó lấy dữ liệu mới từ server
  revalidatePath("/dashboard/invoices");
  // hướng người dùng quay lại màn invoices list
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices SET customer_id=${customerId}, amount=${amountInCents}, status=${status}
    WHERE id=${id}
    `;

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id=${id} `;
  revalidatePath("/dashboard/invoices");
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/hooks/use-locale";

const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

/**
 * Checkout form — collects customer information.
 *
 * Features:
 * - Client-side validation with Zod
 * - Accessible form fields
 * - Auto-fill for authenticated users via prefillData prop
 * - Works for both guest and authenticated checkout flows
 */
export function CheckoutForm({
  onSubmit,
  isProcessing,
  prefillData,
}: {
  onSubmit: (data: CheckoutFormData) => void;
  isProcessing: boolean;
  prefillData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null;
}) {
  const { t } = useLocale();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: prefillData?.firstName || "",
      lastName: prefillData?.lastName || "",
      email: prefillData?.email || "",
      phone: prefillData?.phone || "",
      notes: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("contactInformation")}
      </h2>

      {prefillData?.firstName && (
        <p className="mb-4 text-sm text-primary-600 bg-primary-50 rounded-lg px-3 py-2">
          {t("signedInAs", { name: `${prefillData.firstName} ${prefillData.lastName}` })}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="label">
            {t("firstName")}
          </label>
          <input
            id="firstName"
            type="text"
            className={`input ${errors.firstName ? "border-red-500" : ""}`}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="label">
            {t("lastName")}
          </label>
          <input
            id="lastName"
            type="text"
            className={`input ${errors.lastName ? "border-red-500" : ""}`}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="label">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            readOnly={!!prefillData?.email}
            className={`input ${errors.email ? "border-red-500" : ""} ${prefillData?.email ? "bg-gray-100 cursor-not-allowed" : ""}`}
            {...register("email")}
          />
          {prefillData?.email && (
            <p className="mt-1 text-xs text-gray-400">{t("emailCannotBeChanged")}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="label">
            {t("phone")}
          </label>
          <input
            id="phone"
            type="tel"
            className={`input ${errors.phone ? "border-red-500" : ""}`}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="notes" className="label">
          {t("orderNotes")}
        </label>
        <textarea
          id="notes"
          rows={3}
          className="input resize-none"
          placeholder={t("orderNotesPlaceholder")}
          {...register("notes")}
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="btn-primary w-full mt-6 py-3 text-base"
      >
        {isProcessing ? t("processing") : t("placeOrder")}
      </button>
    </form>
  );
}

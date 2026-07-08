import { useActionState } from "react";

export default function ContactForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [error, formAction, isPending] = useActionState(async (_prevError, formData) => {
    const contact = {
      name: formData.get("name"),
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      address: formData.get("address") || null,
      notes: formData.get("notes") || null,
    };
    try {
      await onSubmit(contact);
      return null;
    } catch (err) {
      return err.message || "Something went wrong";
    }
  }, null);

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input
          name="name"
          placeholder="Name"
          defaultValue={initial?.name}
          required
          className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          defaultValue={initial?.email ?? ""}
          className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          name="phone"
          placeholder="Phone"
          defaultValue={initial?.phone ?? ""}
          className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          name="address"
          placeholder="Address"
          defaultValue={initial?.address ?? ""}
          className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <textarea
        name="notes"
        placeholder="Notes"
        defaultValue={initial?.notes ?? ""}
        rows={2}
        className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-100 hover:bg-slate-200 rounded-md px-4 py-2 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

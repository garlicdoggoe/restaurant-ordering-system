"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { useData } from "@/lib/data-context"
import { VoucherDialog } from "./voucher-dialog"

export function VouchersView() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<any>(null)

  const { vouchers, updateVoucher, deleteVoucher } = useData()

  const handleToggleActive = (voucherId: string) => {
    const voucher = vouchers.find((v) => v._id === voucherId)
    if (voucher) {
      updateVoucher(voucherId, { active: !voucher.active })
    }
  }

  const handleDelete = (voucherId: string) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return
    deleteVoucher(voucherId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vouchers</h1>
        <Button className="gap-2" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4" />
          Create Voucher
        </Button>
      </div>

      <div className="grid gap-4">
        {vouchers.map((voucher) => {
          const now = Date.now()
          const isExpired = voucher.expiresAt < now
          const usagePercentage = voucher.usageLimit ? (voucher.usageCount / voucher.usageLimit) * 100 : 0

          return (
            <Card key={voucher._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{voucher.code}</CardTitle>
                      {voucher.active && !isExpired && <Badge className="bg-green-500">Active</Badge>}
                      {!voucher.active && <Badge variant="secondary">Inactive</Badge>}
                      {isExpired && <Badge variant="destructive">Expired</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {voucher.type === "percentage" ? `${voucher.value}% off` : `$${voucher.value} off`}
                      {voucher.minOrderAmount && ` on orders over $${voucher.minOrderAmount}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        setEditingVoucher(voucher)
                        setShowDialog(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleToggleActive(voucher._id)}
                      title={voucher.active ? "Deactivate" : "Activate"}
                    >
                      {voucher.active ? (
                        <ToggleRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-destructive bg-transparent"
                      onClick={() => handleDelete(voucher._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-semibold">
                      {voucher.type === "percentage" ? `${voucher.value}%` : `$${voucher.value}`}
                    </p>
                  </div>
                  {voucher.minOrderAmount && (
                    <div>
                      <p className="text-muted-foreground">Min Order</p>
                      <p className="font-semibold">${voucher.minOrderAmount}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className="font-semibold">{new Date(voucher.expiresAt).toLocaleDateString()}</p>
                  </div>
                  {voucher.usageLimit && (
                    <div>
                      <p className="text-muted-foreground">Usage</p>
                      <p className="font-semibold">
                        {voucher.usageCount} / {voucher.usageLimit}
                        <span className="text-xs text-muted-foreground ml-1">({usagePercentage.toFixed(0)}%)</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {vouchers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No vouchers created yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showDialog && (
        <VoucherDialog
          voucher={editingVoucher}
          onClose={() => {
            setShowDialog(false)
            setEditingVoucher(null)
          }}
        />
      )}
    </div>
  )
}

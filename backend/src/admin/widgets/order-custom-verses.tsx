import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/types"
import { Container, Heading, Text, Badge } from "@medusajs/ui"

type LineItemMeta = Record<string, unknown>

const OrderCustomVersesWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const items = (data.items ?? []) as Array<{
    id: string
    title: string
    variant_title?: string
    metadata?: LineItemMeta
  }>

  // Collect items that have a custom verse in their metadata
  const verseItems = items.filter((item) => {
    const meta = item.metadata ?? {}
    return meta.customization || meta.custom_verse
  })

  if (verseItems.length === 0) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Custom Verses</Heading>
        <Badge color="purple" size="2xsmall">
          {verseItems.length} item{verseItems.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="flex flex-col gap-0 divide-y">
        {verseItems.map((item) => {
          const meta = item.metadata ?? {}
          const verse = (meta.customization ?? meta.custom_verse) as string
          const bundleType = meta.bundle_type as string | undefined

          return (
            <div key={item.id} className="flex items-start justify-between px-6 py-4">
              <div className="flex flex-col gap-1">
                <Text size="small" weight="plus">
                  {item.title}
                  {item.variant_title && item.variant_title !== "Default Title"
                    ? ` — ${item.variant_title}`
                    : ""}
                </Text>
                <Text
                  size="small"
                  className="text-ui-fg-subtle italic"
                >
                  &ldquo;{verse}&rdquo;
                </Text>
              </div>
              {bundleType && (
                <Badge color="green" size="2xsmall" className="mt-0.5 shrink-0 ml-4">
                  {bundleType}
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderCustomVersesWidget

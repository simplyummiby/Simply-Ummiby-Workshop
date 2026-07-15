# Simply Ummiby Workshop

**Version 0.6.3.4**

Version 0.6.3.4 restores the final fulfillment stage after packing. Marking an order packed now places it in a visible **Ready to Mail** state, and a separate **Mark as Mailed** action completes the order at 100%.

## Version 0.6.3.4 highlights

- **Mark Order Packed** now records when packing was completed.
- Packed orders remain active with a clear **Ready to Mail** panel.
- **Mark as Mailed** appears only after the order is packed.
- Marking the order mailed records the mailed date and time.
- Every order item moves to **Completed**, and progress becomes 100%.
- Completed orders display a mailed confirmation instead of the active mailing control.
- Existing Pack & Ship inventory deductions and workflow steps remain unchanged.

## Care-sheet printable

Place the approved care sheet PDF at:

```text
printables/caresheet-pt-tp.pdf
```

Opening the printable does not change inventory. Printed stock is added only after the successfully printed quantity is confirmed.

## Local data

Workshop data is stored in browser local storage. Download a backup before clearing browser data or moving to another computer.

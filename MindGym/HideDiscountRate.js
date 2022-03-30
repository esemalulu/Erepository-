function pageInit()
{
  // Hide label
  document.getElementById('discountitem_fs_lbl').style.display = 'none';
  // Hide drop-down
  document.getElementById('discountitem_fs').style.display = 'none';
  // Change label from 'Rate' to 'Discount Rate'
  document.getElementById('discountrate_fs_lbl').innerHTML = 'Discount Rate';
}
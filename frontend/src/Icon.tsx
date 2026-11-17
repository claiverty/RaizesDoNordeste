import { AlertTriangle } from '@boxicons/react/AlertTriangle';
import { ArrowLeftStroke } from '@boxicons/react/ArrowLeftStroke';
import { ArrowRightStroke } from '@boxicons/react/ArrowRightStroke';
import { ArrowUpRightStroke } from '@boxicons/react/ArrowUpRightStroke';
import { Cart } from '@boxicons/react/Cart';
import { Check } from '@boxicons/react/Check';
import { DoorOpen } from '@boxicons/react/DoorOpen';
import { Eye } from '@boxicons/react/Eye';
import { EyeClosed } from '@boxicons/react/EyeClosed';
import { FoodMenu } from '@boxicons/react/FoodMenu';
import { Lock } from '@boxicons/react/Lock';
import { Minus } from '@boxicons/react/Minus';
import { Pencil } from '@boxicons/react/Pencil';
import { Plus } from '@boxicons/react/Plus';
import { Receipt } from '@boxicons/react/Receipt';
import { RefreshCw } from '@boxicons/react/RefreshCw';
import { Save } from '@boxicons/react/Save';
import { Store } from '@boxicons/react/Store';
import { Trash } from '@boxicons/react/Trash';

const icons = {
  alert: AlertTriangle,
  arrowLeft: ArrowLeftStroke,
  arrowRight: ArrowRightStroke,
  arrowUpRight: ArrowUpRightStroke,
  cart: Cart,
  check: Check,
  exit: DoorOpen,
  eye: Eye,
  eyeClosed: EyeClosed,
  menu: FoodMenu,
  lock: Lock,
  minus: Minus,
  edit: Pencil,
  plus: Plus,
  receipt: Receipt,
  refresh: RefreshCw,
  save: Save,
  store: Store,
  trash: Trash,
};

export default function Icon({ name, className = '' }: { name: keyof typeof icons; className?: string }) {
  const Glyph = icons[name];
  return <Glyph className={`ui-icon ${className}`.trim()} pack="basic" aria-hidden="true" focusable="false" />;
}

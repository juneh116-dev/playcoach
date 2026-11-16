'use client';

import {regions, regionLabels} from '@/lib/pc-catalog';

type Props = {
  value: string;
  province: string;
  onChange: (value: string) => void;
  onProvinceChange: (province: string) => void;
  disabled?: boolean;
};

export default function Region({value, province, onChange, onProvinceChange, disabled = false}: Props) {
  return <div className="region">
    <label>시·도<select aria-label="시·도" value={province} disabled={disabled} onChange={event => {
      onProvinceChange(event.target.value);
      onChange('');
    }}>
      <option value="">시·도 선택</option>
      {Object.keys(regions).map(city => <option key={city} value={city}>{regionLabels[city]}</option>)}
    </select></label>
    <label>시·군·구<select aria-label="시·군·구" value={value} disabled={disabled || !province} onChange={event => onChange(event.target.value)}>
      <option value="">{province ? '상세 지역 선택' : '시·도를 먼저 선택'}</option>
      {(regions[province] || []).map(district => <option key={district} value={province + ' ' + district}>{district}</option>)}
    </select></label>
  </div>;
}

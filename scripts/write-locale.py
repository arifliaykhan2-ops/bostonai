#!/usr/bin/env python3
"""Writes one locale from "key = value" lines on stdin (hand or AI translations).

    python3 scripts/write-locale.py de < de.txt

- Keys must exist in mobile/src/i18n/locales/en.json (plural keys may add the
  categories the language needs: _zero/_one/_two/_few/_many/_other).
- Keys starting with "native." go to mobile/src/i18n/native/<locale>.json (iOS permission texts).
- {placeholders} must match the English text. Values equal to English are dropped
  (the app falls back to English for missing keys).
- Lines that are empty or start with # are ignored.
"""
import json, re, sys, os, collections

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LOC = os.path.join(ROOT, 'mobile/src/i18n/locales')
NAT = os.path.join(ROOT, 'mobile/src/i18n/native')
PLURAL = re.compile(r'_(zero|one|two|few|many|other)$')

def ph(s):
    return sorted(set(re.findall(r'\{(\w+)\}', s)))

def main():
    loc = sys.argv[1]
    en = json.load(open(os.path.join(LOC, 'en.json')), object_pairs_hook=collections.OrderedDict)
    nat_en = json.load(open(os.path.join(NAT, 'en.json')), object_pairs_hook=collections.OrderedDict)
    bases = {PLURAL.sub('', k) for k in en if PLURAL.search(k)}
    vals, errors = {}, []
    for n, line in enumerate(sys.stdin.read().splitlines(), 1):
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        if ' = ' not in line:
            errors.append(f'line {n}: no " = "'); continue
        k, v = line.split(' = ', 1)
        k, v = k.strip(), v.strip()
        if k.startswith('native.'):
            if k[7:] not in nat_en: errors.append(f'unknown native key {k}'); continue
            ref = nat_en[k[7:]]
        elif k in en:
            ref = en[k]
        elif PLURAL.search(k) and PLURAL.sub('', k) in bases:
            ref = en[PLURAL.sub('', k) + '_other']
        else:
            errors.append(f'unknown key {k}'); continue
        # Some languages drop the number in singular/dual forms (Arabic "منذ دقيقة" = "a minute ago").
        plural_ok = PLURAL.search(k) and ph(v) == [x for x in ph(ref) if x != 'count']
        if ph(v) != ph(ref) and not plural_ok:
            errors.append(f'placeholders differ in {k}: {v!r} vs {ref!r}'); continue
        vals[k] = v
    for e in errors: print('ERROR', e)

    out = collections.OrderedDict()
    for k in en:
        if PLURAL.search(k):
            base = PLURAL.sub('', k)
            for cat in ('zero', 'one', 'two', 'few', 'many', 'other'):
                kk = f'{base}_{cat}'
                if kk in vals and kk not in out: out[kk] = vals[kk]
        elif k in vals and vals[k] != en[k]:
            out[k] = vals[k]
    json.dump(out, open(os.path.join(LOC, f'{loc}.json'), 'w'), ensure_ascii=False, indent=2)
    open(os.path.join(LOC, f'{loc}.json'), 'a').write('\n')

    nat = collections.OrderedDict((k, vals.get('native.' + k, v)) for k, v in nat_en.items())
    nat['CFBundleDisplayName'] = nat_en['CFBundleDisplayName']
    json.dump(nat, open(os.path.join(NAT, f'{loc}.json'), 'w'), ensure_ascii=False, indent=2)
    open(os.path.join(NAT, f'{loc}.json'), 'a').write('\n')

    missing = [k for k in en if not PLURAL.search(k) and k not in vals]
    print(f'{loc}: {len(out)} keys written, {len(missing)} left in English, {len(errors)} errors')

if __name__ == '__main__':
    main()

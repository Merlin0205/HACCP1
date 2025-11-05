# Flowbite Příručka - Jak správně používat Flowbite v projektu

## ⚠️ DŮLEŽITÉ PRAVIDLA

### ✅ VŽDY:
1. **Používej Flowbite komponenty přímo** - ne wrapper komponenty pokud není nutné
2. **Kontroluj Flowbite dokumentaci** před každou změnou: https://flowbite-react.com/
3. **Zachovej původní barvy** pomocí inline styles nebo custom theme
4. **Používej Flowbite props** podle dokumentace (icon jako funkce, rightIcon jako funkce)
5. **Light mode** - aplikace je vždy v light mode (class="light" na html)

### ❌ NIKDY:
1. **Nepoužívej custom CSS** místo Flowbite tříd
2. **Nevytvářej wrapper komponenty** pokud není nutné zachovat API
3. **Nepoužívej dark mode** - aplikace je vždy světlá
4. **Nepřepisuj Flowbite styles** pomocí !important
5. **Nepoužívej Tailwind gradient třídy** pro barvy - použij inline styles

## 📚 Komponenty podle Flowbite dokumentace

### Button
```tsx
import { Button } from 'flowbite-react';

// ✅ SPRÁVNĚ
<Button color="blue" size="md">Text</Button>
<Button color="gray" outline>Text</Button>

// ❌ ŠPATNĚ
<Button className="bg-red-500">Text</Button> // Použij color prop
```

### TextInput
```tsx
import { TextInput, Label } from 'flowbite-react';

// ✅ SPRÁVNĚ - icon jako funkce
<TextInput 
  icon={() => <SearchIcon />}
  rightIcon={() => <ClearIcon />}
  color="failure" // pro error state
/>

// ❌ ŠPATNĚ
<TextInput icon={<SearchIcon />} /> // icon musí být funkce
```

### Card
```tsx
import { Card } from 'flowbite-react';

// ✅ SPRÁVNĚ
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Footer</Card.Footer>
</Card>
```

### Modal
```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react';

// ✅ SPRÁVNĚ - importuj samostatné komponenty
<Modal show={isOpen} onClose={onClose} size="md">
  <ModalHeader>Title</ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>Footer</ModalFooter>
</Modal>

// ❌ ŠPATNĚ - subkomponenty nejsou dostupné přes alias
import { Modal as FlowbiteModal } from 'flowbite-react';
<FlowbiteModal.Header /> // ❌ Undefined!
```

### Sidebar (pro Layout)
```tsx
import { Sidebar } from 'flowbite-react';

// ✅ SPRÁVNĚ podle Flowbite dokumentace
<Sidebar aria-label="Sidebar">
  <Sidebar.Items>
    <Sidebar.ItemGroup>
      <Sidebar.Item icon={HomeIcon} active>Dashboard</Sidebar.Item>
    </Sidebar.ItemGroup>
  </Sidebar.Items>
</Sidebar>
```

### Drawer (pro MobileMenu)
```tsx
import { Drawer } from 'flowbite-react';

// ✅ SPRÁVNĚ podle Flowbite dokumentace
<Drawer open={isOpen} onClose={onClose}>
  <Drawer.Header title="Menu" />
  <Drawer.Items>
    <Drawer.Item icon={HomeIcon}>Home</Drawer.Item>
  </Drawer.Items>
</Drawer>
```

### Table
```tsx
import { Table } from 'flowbite-react';

// ✅ SPRÁVNĚ
<Table>
  <Table.Head>
    <Table.HeadCell>Name</Table.HeadCell>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Data</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

## 🎨 Zachování původních barev

### Pro gradienty:
```tsx
// ✅ SPRÁVNĚ - inline style
<div style={{
  background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.darkest})`
}}>
  Content
</div>

// ❌ ŠPATNĚ - Tailwind gradient třídy se nemusí správně aplikovat
<div className={`bg-gradient-to-r ${theme.colors.gradient}`}>
```

### Pro primární barvy:
```tsx
// ✅ SPRÁVNĚ - použij custom theme nebo inline style
<Button className="bg-primary hover:bg-primary-dark" />

// ❌ ŠPATNĚ - nepřepisuj Flowbite color prop
<Button color="blue" className="bg-red-500" />
```

## 🔧 Wrapper komponenty (pouze když je nutné zachovat API)

### Kdy použít wrapper:
- Když potřebuješ zachovat existující API komponenty
- Když máš custom props, které Flowbite nemá

### Jak vytvořit wrapper:
```tsx
// ✅ SPRÁVNĚ - wrapper zachovává API, ale používá Flowbite uvnitř
import { Button as FlowbiteButton } from 'flowbite-react';

export const Button: React.FC<ButtonProps> = (props) => {
  // Mapování vlastních props na Flowbite props
  return (
    <FlowbiteButton
      color={mapColor(props.variant)}
      size={mapSize(props.size)}
      {...props}
    />
  );
};
```

## ✅ Checklist před každou změnou

- [ ] Zkontroloval jsem Flowbite dokumentaci pro tuto komponentu?
- [ ] Používám správné Flowbite props podle dokumentace?
- [ ] Zachoval jsem původní barvy z SECTION_THEMES?
- [ ] Používám inline styles pro gradienty?
- [ ] Komponenta funguje v light mode?
- [ ] Není tam žádný dark mode CSS?
- [ ] Icon props jsou funkce (pokud Flowbite vyžaduje)?
- [ ] Otestoval jsem komponentu v prohlížeči?

## 🔗 Užitečné odkazy

- Flowbite React Dokumentace: https://flowbite-react.com/
- Flowbite Komponenty: https://flowbite-react.com/docs/components/button
- Flowbite Theme: https://flowbite-react.com/docs/customize/theme
- Flowbite Sidebar: https://flowbite-react.com/docs/components/sidebar
- Flowbite Drawer: https://flowbite-react.com/docs/components/drawer

## 📝 Příklady migrace

### Před (custom):
```tsx
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Click me
</button>
```

### Po (Flowbite):
```tsx
import { Button } from 'flowbite-react';

<Button color="blue">Click me</Button>
```

### Před (custom Card):
```tsx
<div className="bg-white rounded-lg shadow p-4">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

### Po (Flowbite Card):
```tsx
import { Card } from 'flowbite-react';

<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

## 🚨 Časté chyby

### Chyba 1: Icon jako JSX místo funkce
```tsx
// ❌ ŠPATNĚ
<TextInput icon={<SearchIcon />} />

// ✅ SPRÁVNĚ
<TextInput icon={() => <SearchIcon />} />
```

### Chyba 2: Gradienty pomocí Tailwind tříd
```tsx
// ❌ ŠPATNĚ
<div className={`bg-gradient-to-r ${theme.colors.gradient}`}>

// ✅ SPRÁVNĚ
<div style={{
  background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.darkest})`
}}>
```

### Chyba 3: Dark mode třídy
```tsx
// ❌ ŠPATNĚ
<div className="bg-white dark:bg-gray-800">

// ✅ SPRÁVNĚ
<div className="bg-white">
```

---

**PAMATUJ SI: Flowbite dokumentace je tvůj "svatý grál" - vždy ji kontroluj před psaním kódu!**


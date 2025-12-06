import { listClientWebsites, createClientWebsite, type ClientWebsiteListItem } from "@/services/paginas/paginasService";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Switch,
} from "@heroui/react";
import { PencilSimpleIcon, FilesIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const columns = [
  { name: "Nombre", uid: "name" },
  { name: "Puede editar BD", uid: "can_change_fields_on_bd" },
  { name: "Creada", uid: "created_at" },
  { name: "Actualizada", uid: "updated_at" },
  { name: "Acciones", uid: "actions" },
];

export default function PaginasPage() {
  const [data, setData] = useState<ClientWebsiteListItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // form state
  const [canChange, setCanChange] = useState(false);
  const [globalTitle, setGlobalTitle] = useState("");
  const [customElementInput, setCustomElementInput] = useState("");
  const [customElements, setCustomElements] = useState<string[]>([]);
  const [pagesText, setPagesText] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClientWebsites().then((items) => setData(items));
  }, []);

  const openModal = () => {
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setCanChange(false);
    setName("");
    setGlobalTitle("");
    setCustomElementInput("");
    setCustomElements([]);
    setPagesText("");
  };

  const addCustomElement = () => {
    const v = customElementInput.trim();
    if (!v) return;
    setCustomElements((prev) => [...prev, v]);
    setCustomElementInput("");
  };

  const removeCustomElement = (index: number) => {
    setCustomElements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!name.trim()) {
        setError("El nombre es requerido");
        setIsSubmitting(false);
        return;
      }
      let pages: unknown = undefined;
      const trimmed = pagesText.trim();
      if (trimmed) {
        try {
          pages = JSON.parse(trimmed);
        } catch (e) {
          setError("El campo Pages no es un JSON válido");
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        name: name.trim(),
        can_change_fields_on_bd: canChange,
        global_header: {
          general_global_title: globalTitle || undefined,
          custom_header_elements: customElements.length ? customElements : undefined,
        },
        pages,
      };

      await createClientWebsite(payload);
      closeModal();
      const refreshed = await listClientWebsites();
      setData(refreshed);
    } catch (e: any) {
      setError(e?.message ?? "Error creando el sitio");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-end gap-4 p-8 pb-0 w-full">
        <Button color="primary" onClick={openModal}>Crear sitio</Button>
      </div>
      <Table className="w-full p-8">
        <TableHeader>
          {columns.map((column) => (
            <TableColumn key={column.uid}>{column.name}</TableColumn>
          ))}
        </TableHeader>
        <TableBody emptyContent={"No hay sitios por mostrar."}>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{Boolean(item.can_change_fields_on_bd) ? "Sí" : "No"}</TableCell>
              <TableCell>{item.created_at}</TableCell>
              <TableCell>{item.updated_at ?? "-"}</TableCell>
              <TableCell>
                <Tooltip content="Editar">
                  <PencilSimpleIcon cursor='pointer' onClick={() => navigate(`/paginas/${item.id}`)} />
                </Tooltip>
                <Tooltip content="Biblioteca de medios">
                  <FilesIcon className="ml-3" cursor='pointer' onClick={() => navigate(`/biblioteca?site=${encodeURIComponent(item.id)}`)} />
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={closeModal} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Crear sitio</ModalHeader>
              <ModalBody>
                <Input
                  label="Nombre"
                  placeholder="Ej: Sitio de Cliente XYZ"
                  value={name}
                  onValueChange={setName}
                />
                <Switch isSelected={canChange} onValueChange={setCanChange}>
                  Puede cambiar campos en BD
                </Switch>
                <Input
                  label="Título global"
                  placeholder="general_global_title"
                  value={globalTitle}
                  onValueChange={setGlobalTitle}
                />
                <div className="flex items-end gap-2">
                  <Input
                    label="Elemento de header personalizado"
                    placeholder="<script>...</script>"
                    value={customElementInput}
                    onValueChange={setCustomElementInput}
                  />
                  <Button size="sm" onClick={addCustomElement}>Agregar</Button>
                </div>
                {customElements.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-foreground/70">Elementos agregados:</p>
                    <ul className="list-disc ml-5">
                      {customElements.map((el, idx) => (
                        <li key={`${el}-${idx}`} className="flex items-center gap-2">
                          <span className="break-all">{el}</span>
                          <Button size="sm" variant="light" onClick={() => removeCustomElement(idx)}>Eliminar</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-sm">Pages (JSON opcional)</label>
                  <textarea
                    className="w-full h-32 p-2 border rounded-md"
                    placeholder='{"pages": [...]}'
                    value={pagesText}
                    onChange={(e) => setPagesText(e.target.value)}
                  />
                </div>
                {error && <p className="text-danger text-sm">{error}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button color="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                  Crear
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

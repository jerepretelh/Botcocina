import type { BacklogEpic, BacklogItem, BacklogPriority, BacklogStatus } from '../../types';

export interface BacklogSectionEntry {
  epicId: string;
  epicTitle: string;
  epicSummary: string;
  epicArea: BacklogEpic['area'];
  epicPriority: BacklogPriority;
  epicStatus: BacklogStatus;
  items: BacklogItem[];
}

export interface BacklogSection {
  status: BacklogStatus;
  title: string;
  description: string;
  count: number;
  epics: BacklogSectionEntry[];
}

const statusOrder: BacklogStatus[] = ['pending', 'in_progress', 'done'];
const priorityWeight: Record<BacklogPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function sortByPriority<T extends { priority: BacklogPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);
}

function statusMeta(status: BacklogStatus): Pick<BacklogSection, 'title' | 'description'> {
  switch (status) {
    case 'pending':
      return {
        title: 'Pendiente',
        description: 'Trabajo que ya está identificado y conviene preparar para la siguiente ola.',
      };
    case 'in_progress':
      return {
        title: 'En progreso',
        description: 'Trabajo activo o parcialmente cerrado que todavía necesita seguimiento.',
      };
    case 'done':
      return {
        title: 'Hecho',
        description: 'Trabajo ya resuelto que conviene mantener visible como continuidad del producto.',
      };
  }
}

export function buildBacklogSections(epics: BacklogEpic[]): BacklogSection[] {
  return statusOrder.map((status) => {
    const sectionEpics = epics
      .map((epic) => ({
        epicId: epic.id,
        epicTitle: epic.title,
        epicSummary: epic.summary,
        epicArea: epic.area,
        epicPriority: epic.priority,
        epicStatus: epic.status,
        items: sortByPriority(epic.items.filter((item) => item.status === status)),
      }))
      .filter((entry) => entry.items.length > 0)
      .sort((a, b) => {
        const priorityDiff = priorityWeight[a.epicPriority] - priorityWeight[b.epicPriority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.epicTitle.localeCompare(b.epicTitle);
      });

    return {
      status,
      ...statusMeta(status),
      count: sectionEpics.reduce((sum, epic) => sum + epic.items.length, 0),
      epics: sectionEpics,
    };
  });
}

export function summarizeBacklog(epics: BacklogEpic[]) {
  const items = epics.flatMap((epic) => epic.items);
  return {
    epics: epics.length,
    stories: items.filter((item) => item.type === 'story').length,
    tasks: items.filter((item) => item.type === 'task').length,
    pending: items.filter((item) => item.status === 'pending').length,
    inProgress: items.filter((item) => item.status === 'in_progress').length,
    done: items.filter((item) => item.status === 'done').length,
  };
}

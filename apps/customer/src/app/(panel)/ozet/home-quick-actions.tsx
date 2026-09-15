'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/icon'

const ListRequestModal = dynamic(
  () => import('../kisiler/list-request-modal').then((mod) => mod.ListRequestModal),
  { ssr: false },
)
const NewGroupModal = dynamic(
  () => import('../kisiler/new-group-form').then((mod) => mod.NewGroupModal),
  { ssr: false },
)
const AddPersonModal = dynamic(
  () => import('../kisiler/add-person-modal').then((mod) => mod.AddPersonModal),
  { ssr: false },
)

type Action =
  | { href: string; label: string; icon: IconName; primary?: boolean }
  | { action: 'group' | 'person' | 'list'; label: string; icon: IconName }

const ACTIONS: Action[] = [
  { href: '/kampanyalar/yeni', label: '+ Kampanya', icon: 'campaign', primary: true },
  { href: '/icerik/yeni', label: '+ Görsel', icon: 'image' },
  { action: 'person', label: '+ Kişi', icon: 'people' },
  { action: 'group', label: '+ Grup', icon: 'people' },
]

export function HomeQuickActions() {
  const [listOpen, setListOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [personOpen, setPersonOpen] = useState(false)

  return (
    <>
      <div className="wb-home-actions">
        {ACTIONS.map((item) => {
          if ('href' in item) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`wb-home-action${item.primary ? ' is-primary' : ''}`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            )
          }
          return (
            <button
              key={item.label}
              type="button"
              className="wb-home-action"
              onClick={() => {
                if (item.action === 'group') setGroupOpen(true)
                else if (item.action === 'person') setPersonOpen(true)
                else setListOpen(true)
              }}
            >
              <Icon name={item.icon} className="size-4" />
              {item.label}
            </button>
          )
        })}
      </div>
      {listOpen ? <ListRequestModal onClose={() => setListOpen(false)} /> : null}
      {groupOpen ? <NewGroupModal onClose={() => setGroupOpen(false)} /> : null}
      {personOpen ? <AddPersonModal onClose={() => setPersonOpen(false)} /> : null}
    </>
  )
}

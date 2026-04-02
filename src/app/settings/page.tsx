export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Настройки</h2>
          <p className="text-sm text-gray-500 mt-1">Системные настройки и параметры профиля</p>
        </div>
      </div>
      
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
        <div className="text-center text-gray-500 p-8">
          <p className="text-xl font-medium text-gray-900 mb-2">В разработке</p>
          <p>Настройки системы появятся в будущих обновлениях.</p>
        </div>
      </div>
    </div>
  );
}

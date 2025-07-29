document.getElementById('test').innerHTML = /* html */ `

    <dialog
      id="modalContainer"
      data-color="amber"
      class="bg-black/30 opacity-0 hidden flex w-full h-full inset-0 overflow-hidden duration-300 content-center"
    >
<div
        class=" max-w-2xl w-full rounded-2xl -translate-y-6 bg-white shadow-xl overflow-hidden m-auto scale-95 duration-300"
      >
        <div
          class="bg-gradient-to-br from-amber-500 to-amber-800 p-7 text-white flex flex-col gap-2 text-center"
        >
          <p id="modalTitle" class="text-3xl font-medium"></p>
          <p id="modalSubtitle" class="hidden text-sm"></p>
        </div>
        <div class="p-8 flex flex-col">
          <form class="flex flex-col gap-4">
            <div class="hidden grid grid-cols-2 gap-6">
              <div
                class="relative rounded-lg p-4 border-2 border-gray-300 flex flex-col gap-4 hover:border-amber-500 duration-300"
              >
                <label class="font-medium text-sm text-gray-600">Image</label>
                <img
                  id="input-image"
                  class="rounded-lg min-h-[12.5rem] max-h-[9rem] w-full object-cover"
                />
                <div
                  class="hidden absolute inset-0 mt-[3.3rem] mx-4 min-h-[12.5rem] max-h-[9rem] rounded-lg bg-black/30 backdrop-blur-[2px]"
                ></div>
                <input
                  type="file"
                  id="input-image-upload"
                  accept="image/*"
                  class="hidden"
                />
                <button
                  type="button"
                  class="absolute top-0 right-0 mx-4 my-3.5 text-xs py-1 px-2 bg-gray-200 rounded-lg font-bold text-gray-500 duration-300 hover:bg-amber-500 hover:text-white"
                >
                  Upload Photo
                </button>
                <div
                  class="absolute inset-0 mt-[3.3rem] mx-4 min-h-[12.5rem] max-h-[9rem] text-center content-center font-black text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
                >
                  <p class="text-lg -mb-1"></p>
                  <p
                    class="text-4xl text-yellow-500 drop-shadow-[0_1.2px_1.2px_rgba(255,0,0,0.8)]"
                  ></p>
                  <p class="text-xl"></p>
                </div>
              </div>

              <div class="flex flex-col gap-4">
                <div class="hidden flex flex-col gap-2 font-medium">
                  <label class="text-sm text-gray-600"> </label>
                  <input
                    autocomplete="off"
                    class="px-4 py-3 border-2 bg-gray-100 border-gray-300 rounded-md duration-300 focus:outline-amber-500 focus:ring-2 focus:ring-amber-200"
                    placeholder="Input"
                  />
                </div>
              </div>
            </div>

            <div class="hidden flex flex-col gap-2 font-medium">
              <label class="text-sm text-gray-600"> </label>
              <input
                autocomplete="off"
                id="input-short"
                class="px-4 py-3 border-2 bg-gray-100 border-gray-300 rounded-md duration-300 focus:outline-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="Input"
              />
            </div>

            <div class="hidden flex flex-col gap-2 font-medium">
              <label class="text-sm text-gray-600"> </label>
              <div class="cursor-pointer relative">
                <select
                  id="input-spinner"
                  class="cursor-pointer w-full px-4 py-3 appearance-none border-2 bg-gray-100 border-gray-300 rounded-md duration-300 focus:outline-amber-500 focus:ring-2 focus:ring-amber-200"
                >
                  <option
                    value=""
                    disabled
                    selected
                    class="font-medium"
                  ></option>
                  <option value="" class="font-medium"></option>
                </select>
                <p class="absolute top-0 right-0 m-4 text-xs text-gray-400">
                  ▼
                </p>
              </div>
            </div>

            <div class="hidden flex flex-col gap-2 font-medium text-sm">
              <label class="text-gray-600"> </label>
              <textarea
                id="input-large"
                autocomplete="off"
                class="resize-none px-4 py-3 border-2 bg-gray-100 border-gray-300 rounded-md duration-300 focus:outline-amber-500 focus:ring-2 focus:ring-amber-200"
                placeholder="Input"
                rows="7"
              ></textarea>
            </div>

            <div class="hidden flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-600"> </label>
              <div id="input-radio" class="grid gap-6 h-36">
                <div
                  class="hidden cursor-pointer space-y-2 rounded-md bg-gray-100 border-2 border-gray-300 duration-300 hover:border-amber-500 text-center content-center"
                >
                  <p class="text-4xl"></p>
                  <p class="font-medium"></p>
                  <p class="text-sm text-gray-500"></p>
                </div>
              </div>
            </div>

            <div class="flex gap-4">
              <button
                type="button"
                id="modalSubBtn"
                class="hidden w-full text-white bg-gray-500 rounded-lg mt-4 p-4 font-bold hover:scale-105 active:scale-95 duration-300 shadow-lg hover:shadow-xl hover:shadow-gray-500 active:shadow-none active:bg-gray-600 hover:bg-gray-400"
              ></button>
              <button
                id="modalMainBtn"
                type="button"
                class="w-full text-white bg-amber-600 rounded-lg mt-4 p-4 font-bold hover:scale-105 active:scale-95 duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-600 active:shadow-none active:bg-amber-700 hover:bg-amber-500"
              ></button>
            </div>
          </form>
        </div>
      </div>
    </dialog>

`;

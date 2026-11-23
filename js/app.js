/**
 * 우리동네 화물주차장 조성현황 - Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentFilter = 'all';
  let searchQuery = '';
  let viewMode = 'grid'; // 'grid' | 'table'
  let sortOption = 'default'; // 'default' | 'date-asc' | 'date-desc' | 'area-desc' | 'capacity-desc'

  const gridContainer = document.getElementById('cardGrid');
  const tableContainer = document.getElementById('tableContainer');
  const searchInput = document.getElementById('searchInput');
  const chipGroup = document.getElementById('chipGroup');
  const sortSelect = document.getElementById('sortSelect');
  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');

  // 날짜 문자열(예: "2025. 09. 25.")을 정렬용 정수 값(20250925)으로 파싱하는 함수
  function parseDateValue(dateStr) {
    if (!dateStr) return 99999999;
    const nums = dateStr.replace(/[^0-9]/g, '');
    if (nums.length >= 8) {
      return parseInt(nums.substring(0, 8), 10);
    } else if (nums.length >= 6) {
      return parseInt(nums.substring(0, 6) + '01', 10);
    }
    // "입지 및 타당성 검토중" 등 날짜가 없는 미지정 항목은 맨 뒤로 배치
    return 99999999;
  }

  // 1. 요약 메트릭 계산 및 렌더링
  function updateSummaryMetrics(data) {
    const completedList = data.filter(d => d.status === '조성완료');
    const reviewList = data.filter(d => d.status === '검토중');

    const totalCount = completedList.length;
    const reviewCount = reviewList.length;

    // 조성완료 기준 기본 계산
    const totalArea = completedList.reduce((acc, curr) => acc + curr.area, 0);
    const totalCapacity = completedList.reduce((acc, curr) => acc + curr.capacity, 0);

    const reviewArea = reviewList.reduce((acc, curr) => acc + curr.area, 0);
    const reviewCapacity = reviewList.reduce((acc, curr) => acc + curr.capacity, 0);

    document.getElementById('metricCount').textContent = `${totalCount}개소`;
    document.getElementById('metricReviewCount').textContent = `${reviewCount}개소`;
    
    if (reviewCount > 0 && currentFilter === 'all') {
      document.getElementById('metricArea').textContent = `${totalArea.toLocaleString()} ㎡`;
      document.getElementById('metricPyeong').textContent = `조성 완료 (검토중 ${reviewArea.toLocaleString()}㎡ 별도)`;
      document.getElementById('metricCapacity').textContent = `${totalCapacity} 면`;
    } else {
      const activeArea = data.reduce((acc, curr) => acc + curr.area, 0);
      const activePyeong = Math.round(activeArea * 0.3025);
      const activeCap = data.reduce((acc, curr) => acc + curr.capacity, 0);

      document.getElementById('metricArea').textContent = `${activeArea.toLocaleString()} ㎡`;
      document.getElementById('metricPyeong').textContent = `약 ${activePyeong.toLocaleString()} 평`;
      document.getElementById('metricCapacity').textContent = `${activeCap} 면`;
    }
  }

  // 2. 경기도 부동산포털 원스톱 부동산종합정보 (oneStopView.do) 딥링크 생성 함수
  function getGisUrl(item) {
    if (item.pnu) {
      return `https://gris.gg.go.kr/ost/oneStopView.do?pnu=${item.pnu}`;
    }
    const cleanAddr = item.fullAddress.replace('경기도 ', '');
    return `https://gris.gg.go.kr/ost/oneStopView.do?jibun=${encodeURIComponent(cleanAddr)}`;
  }

  // 3. 카드 보드 HTML 생성 (카드 상단 헤더 텍스트에도 딥링크 적용)
  function renderCard(item) {
    const pyeong = Math.round(item.area * 0.3025);
    const gisUrl = getGisUrl(item);
    const isReview = item.status === '검토중';

    const cardClass = isReview ? 'parking-card card-review' : 'parking-card';
    const noBadgeClass = isReview ? 'badge-no no-review' : 'badge-no';
    const statusBadgeClass = isReview ? 'badge-status review' : 'badge-status';
    const statusIcon = isReview ? 'fa-hourglass-half' : 'fa-circle-check';
    const statusSubText = isReview ? '입지 타당성 검토' : '정상 운영중';

    return `
      <div class="${cardClass}" data-no="${item.no}">
        <!-- Card Header (Entire Header is Clickable -> OneStop View) -->
        <div class="card-header">
          <div class="card-title-group">
            <div class="${noBadgeClass}">${item.no}</div>
            <div>
              <a href="${gisUrl}" target="_blank" rel="noopener noreferrer" class="card-location-link" title="경기도부동산포털 부동산종합정보 연결">
                <div class="card-location">
                  ${item.location} <i class="fa-solid fa-arrow-up-right-from-square card-location-icon"></i>
                </div>
                <div class="card-location-sub">${item.fullAddress}</div>
              </a>
            </div>
          </div>
          <span class="${statusBadgeClass}">
            <i class="fa-solid ${statusIcon}"></i> ${item.status}
          </span>
        </div>

        <!-- Address Pill (Click -> Gyeonggi GIS Portal OneStop View) -->
        <div class="address-link-container">
          <a href="${gisUrl}" target="_blank" rel="noopener noreferrer" class="address-pill" title="경기도부동산포털 부동산종합정보에서 지번 조회하기">
            <span class="address-text">
              <i class="fa-solid fa-map-location-dot text-blue"></i>
              ${item.fullAddress}
            </span>
            <span class="btn-gis-badge">
              부동산종합정보 <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </span>
          </a>
        </div>

        <!-- Specs Grid -->
        <div class="card-specs">
          <div class="spec-item">
            <span class="spec-label">부지 면적</span>
            <span class="spec-value">${item.area.toLocaleString()} <small>㎡</small></span>
            <span class="spec-detail">약 ${pyeong.toLocaleString()}평</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">주차 대수</span>
            <span class="spec-value ${isReview ? 'text-orange' : 'text-blue'}">${item.capacity} <small>대(면)</small></span>
            <span class="spec-detail">${item.category}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">${isReview ? '추진 단계' : '조성/지정일'}</span>
            <span class="spec-value spec-date">${item.date}</span>
            <span class="spec-status">${statusSubText}</span>
          </div>
        </div>

        <!-- Images Dual Grid -->
        <div class="card-images-section">
          <div class="images-header">
            <span class="images-title">
              <i class="fa-solid fa-images text-blue"></i> 현황 시각 자료
            </span>
            <span class="image-hint">클릭시 원본 확대</span>
          </div>
          <div class="image-dual-grid">
            <div class="img-box" data-image="map">
              <span class="img-tag">위치도</span>
              <img src="${item.mapImage}" alt="위치도" loading="lazy">
              <div class="img-overlay"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
            </div>
            <div class="img-box" data-image="photo">
              <span class="img-tag photo-tag">현장사진</span>
              <img src="${item.photoImage}" alt="현장사진" loading="lazy">
              <div class="img-overlay"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
            </div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <span>연번 ${item.no}번 | 스마트화물팀</span>
          <button class="btn-action-sm" data-copy-address>
            <i class="fa-regular fa-copy"></i> 주소 복사
          </button>
        </div>
      </div>
    `;
  }

  // 4. 테이블 뷰 HTML 생성
  function renderTable(dataList) {
    if (dataList.length === 0) {
      return `<div class="table-empty">검색 결과가 없습니다.</div>`;
    }

    let rowsHtml = dataList.map(item => {
      const pyeong = Math.round(item.area * 0.3025);
      const gisUrl = getGisUrl(item);
      const isReview = item.status === '검토중';
      return `
        <tr data-no="${item.no}">
          <td class="table-number-cell">
            <span class="${isReview ? 'badge-no no-review' : 'badge-no'} table-number-badge">${item.no}</span>
          </td>
          <td>
            <a href="${gisUrl}" target="_blank" rel="noopener noreferrer" class="address-pill table-address" title="경기도부동산포털 부동산종합정보로 이동">
              <strong>${item.location}</strong> (${item.fullAddress})
              <i class="fa-solid fa-arrow-up-right-from-square table-link-icon"></i>
            </a>
          </td>
          <td>
            <span class="${isReview ? 'badge-status review' : 'badge-status'} table-status">${item.status}</span>
          </td>
          <td><strong>${item.area.toLocaleString()} ㎡</strong> <br><small class="table-area-detail">약 ${pyeong}평</small></td>
          <td class="table-capacity ${isReview ? 'text-orange' : 'text-blue'}">${item.capacity} 대</td>
          <td><strong>${item.date}</strong></td>
          <td>
            <div class="table-images">
              <img src="${item.mapImage}" class="table-thumb" title="위치도 클릭 확대" alt="위치도" data-image="map">
              <img src="${item.photoImage}" class="table-thumb" title="현장사진 클릭 확대" alt="현장사진" data-image="photo">
            </div>
          </td>
          <td>
            <button class="btn-action-sm" data-copy-address>
              <i class="fa-regular fa-copy"></i> 복사
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-container">
        <table class="google-table">
          <thead>
            <tr>
              <th class="table-number-header">연번</th>
              <th>위치 (주소 클릭 시 부동산종합정보 연결)</th>
              <th class="table-status-header">상태</th>
              <th>면적(㎡)</th>
              <th>주차대수</th>
              <th>조성/지정일자</th>
              <th>현황 이미지 (위치도 / 현장사진)</th>
              <th>기능</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // 5. 필터링, 정렬 및 대시보드 업데이트
  function filterAndRender() {
    const filtered = parkingData.filter(item => {
      let matchFilter = true;
      if (currentFilter === 'status-completed') {
        matchFilter = (item.status === '조성완료');
      } else if (currentFilter === 'status-review') {
        matchFilter = (item.status === '검토중');
      } else if (currentFilter.startsWith('region-')) {
        const targetRegion = currentFilter.replace('region-', '');
        matchFilter = (item.region === targetRegion);
      }

      const query = searchQuery.toLowerCase();
      const matchQuery = !query || 
        item.location.toLowerCase().includes(query) ||
        item.fullAddress.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.no.toString() === query ||
        item.capacity.toString().includes(query);

      return matchFilter && matchQuery;
    });

    // 지정일자 및 항목 정렬 수행
    filtered.sort((a, b) => {
      if (sortOption === 'date-asc') {
        // 지정일자 오름차순 (오래된 순)
        const valA = parseDateValue(a.date);
        const valB = parseDateValue(b.date);
        if (valA !== valB) return valA - valB;
        return a.no - b.no;
      } else if (sortOption === 'date-desc') {
        // 지정일자 내림차순 (최신 순)
        const valA = parseDateValue(a.date);
        const valB = parseDateValue(b.date);
        if (valA !== valB) return valB - valA;
        return a.no - b.no;
      } else if (sortOption === 'area-desc') {
        return b.area - a.area;
      } else if (sortOption === 'capacity-desc') {
        return b.capacity - a.capacity;
      } else {
        // 기본 연번 순 (default)
        return a.no - b.no;
      }
    });

    updateSummaryMetrics(filtered);

    if (viewMode === 'grid') {
      gridContainer.hidden = false;
      tableContainer.hidden = true;

      if (filtered.length === 0) {
        gridContainer.innerHTML = `
          <div class="grid-empty">
            <i class="fa-solid fa-magnifying-glass grid-empty-icon"></i>
            <h3>검색 조건에 맞는 화물주차장이 없습니다.</h3>
            <p class="grid-empty-message">다른 검색어나 필터를 선택해보세요.</p>
          </div>
        `;
      } else {
        gridContainer.innerHTML = filtered.map(renderCard).join('');
      }
    } else {
      gridContainer.hidden = true;
      tableContainer.hidden = false;
      tableContainer.innerHTML = renderTable(filtered);
    }
  }

  // 6. 이벤트 리스너 설정
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndRender();
  });

  chipGroup.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    currentFilter = chip.dataset.filter;
    filterAndRender();
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortOption = e.target.value;
      filterAndRender();
    });
  }

  document.getElementById('toggleGrid').addEventListener('click', () => {
    viewMode = 'grid';
    document.getElementById('toggleGrid').classList.add('active');
    document.getElementById('toggleTable').classList.remove('active');
    filterAndRender();
  });

  document.getElementById('toggleTable').addEventListener('click', () => {
    viewMode = 'table';
    document.getElementById('toggleTable').classList.add('active');
    document.getElementById('toggleGrid').classList.remove('active');
    filterAndRender();
  });

  function handleParkingAction(event) {
    const action = event.target.closest('[data-image], [data-copy-address]');
    if (!action) return;

    const no = Number(action.closest('[data-no]').dataset.no);
    const item = parkingData.find(parking => parking.no === no);
    if (action.hasAttribute('data-copy-address')) {
      copyAddress(item.fullAddress);
      return;
    }

    const isMap = action.dataset.image === 'map';
    const imageLabel = isMap ? '위치도' : '현장사진';
    lightboxImg.src = isMap ? item.mapImage : item.photoImage;
    lightboxCaption.textContent = viewMode === 'grid'
      ? `연번 ${item.no} [${item.location}] - ${imageLabel}`
      : `연번 ${item.no} ${imageLabel}`;
    lightbox.classList.add('active');
  }

  gridContainer.addEventListener('click', handleParkingAction);
  tableContainer.addEventListener('click', handleParkingAction);

  lightboxClose.addEventListener('click', () => {
    lightbox.classList.remove('active');
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.classList.remove('active');
    }
  });

  async function copyAddress(address) {
    try {
      await navigator.clipboard.writeText(address);
      showToast(`주소가 복사되었습니다: ${address}`);
    } catch {
      showToast(`주소: ${address}`);
    }
  }

  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  filterAndRender();
});
